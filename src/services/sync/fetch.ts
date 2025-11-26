import { SyncToken, SyncGrabQuery, SyncEntry, SyncSyncable } from "./index"
import { EpochSeconds } from "./utils/epoch.js"

import { globalConfig } from '../config.js'
import { RecordId } from "@nozbe/watermelondb"
import BaseModel from "./models/Base"
import { BaseSessionProvider } from "./context/providers"
import { Q } from "@nozbe/watermelondb"

interface RawPullResponse {
  meta: {
    since: EpochSeconds | null
    max_updated_at: EpochSeconds | null
    timestamp: EpochSeconds
  }
  entries: SyncEntry<BaseModel, 'client_record_id'>[]
}

interface RawGrabResponse {
  meta: {}
  entries: SyncEntry<BaseModel, 'client_record_id'>[]
}

interface RawPushResponse {
  meta: {
    timestamp: EpochSeconds
  }
  results: SyncStorePushResult<'client_record_id'>[]
}

export type SyncResponse = SyncPushResponse | SyncPullResponse | SyncGrabResponse

export type SyncPushResponse = SyncPushSuccessResponse | SyncPushFailureResponse

type SyncPushSuccessResponse = SyncPushResponseBase & {
  ok: true
  results: SyncStorePushResult[]
}
type SyncPushFailureResponse = SyncPushResponseBase & {
  ok: false,
  originalError: Error
}
interface SyncPushResponseBase extends SyncResponseBase {
  kind: 'push'
}

type SyncStorePushResult<TRecordKey extends string = 'id'> = SyncStorePushResultSuccess<TRecordKey> | SyncStorePushResultFailure<TRecordKey>
type SyncStorePushResultSuccess<TRecordKey extends string = 'id'> = SyncStorePushResultBase & {
  type: 'success'
  entry: SyncEntry<BaseModel, TRecordKey>
}
type SyncStorePushResultFailure<TRecordKey extends string = 'id'> = SyncStorePushResultProcessingFailure<TRecordKey> | SyncStorePushResultValidationFailure<TRecordKey>
type SyncStorePushResultProcessingFailure<TRecordKey extends string = 'id'> = SyncStorePushResultFailureBase<TRecordKey> & {
  failureType: 'processing'
  error: any
}
type SyncStorePushResultValidationFailure<TRecordKey extends string = 'id'> = SyncStorePushResultFailureBase<TRecordKey> & {
  failureType: 'validation'
  errors: Record<string, string[]>
}
interface SyncStorePushResultFailureBase<TRecordKey extends string = 'id'> extends SyncStorePushResultBase {
  type: 'failure'
  failureType: string
  ids: { [K in TRecordKey]: RecordId }
}
interface SyncStorePushResultBase {
  type: 'success' | 'failure'
}

export type SyncPullResponse = SyncPullSuccessResponse | SyncPullFailureResponse

type SyncPullSuccessResponse = SyncPullResponseBase & {
  ok: true
  entries: SyncEntry[]
  token: SyncToken
  previousToken: SyncToken | null
}
type SyncPullFailureResponse = SyncPullResponseBase & {
  ok: false,
  originalError: Error
}
interface SyncPullResponseBase extends SyncResponseBase {
  kind: 'pull'
}

export type SyncGrabResponse = SyncGrabSuccessResponse | SyncGrabUnfulfillableResponse | SyncGrabFailureResponse | SyncGrabNotImplementedResponse

type SyncGrabSuccessResponse = SyncGrabResponseBase & {
  ok: true
  implemented: true,
  entries: SyncEntry[]
}
type SyncGrabUnfulfillableResponse = SyncGrabResponseBase & {
  ok: false
  implemented: true,
}
type SyncGrabFailureResponse = SyncGrabResponseBase & {
  ok: false,
  implemented: true,
  originalError: Error
}
export type SyncGrabNotImplementedResponse = SyncGrabResponseBase & {
  ok: false,
  implemented: false
}
interface SyncGrabResponseBase extends SyncResponseBase {
  kind: 'grab'
}
export interface SyncResponseBase {
  ok: boolean
}

export type PushPayload = {
  entries: ({
    record: SyncSyncable
    meta: {
      ids: {
        id: RecordId
      }
      deleted: false
    }
  } | {
    record: null
    meta: {
      ids: {
        id: RecordId
      }
      deleted: true
    }
  })[]
}

interface ServerPushPayload {
  entries: {
    record: SyncSyncable<BaseModel, 'client_record_id'> | null
    meta: {
      ids: {
        client_record_id: RecordId
      },
      deleted: boolean
    }
  }[]
}

export function makeFetchRequest(input: RequestInfo, init?: RequestInit): (session: BaseSessionProvider) => Request {
  return (session) => new Request(globalConfig.baseUrl + input, {
    ...init,
    headers: {
      ...init?.headers,
      'Content-Type': 'application/json',
      'X-Sync-Client-Id': session.getClientId(),
      ...(session.getSessionId() ? {
        'X-Sync-Client-Session-Id': session.getSessionId()!
      } : {})
    }
  })
}

export function handlePull(callback: (session: BaseSessionProvider) => Request) {
  return async function(session: BaseSessionProvider, lastFetchToken: SyncToken | null, signal?: AbortSignal): Promise<SyncPullResponse> {
    const generatedRequest = callback(session)
    const url = serializePullUrlQuery(generatedRequest.url, lastFetchToken)
    const request = new Request(url, {
      credentials: 'include',
      headers: generatedRequest.headers,
      signal
    });

    let response: Response | null = null
    try {
      response = await performFetch(request)
    } catch (e) {
      return {
        ok: false,
        originalError: e
      }
    }

    const json = await response.json() as RawPullResponse
    const data = deserializePullResponse(json)

    // if no max_updated_at, at least use the server's timestamp
    // useful for recording that we have at least tried fetching even though resultset empty
    const token = data.meta.max_updated_at || data.meta.timestamp
    const previousToken = data.meta.since

    const entries = data.entries

    return {
      kind: 'pull',
      ok: true,
      entries,
      token,
      previousToken
    }
  }
}

export function handleGrab(
  callback: (session: BaseSessionProvider) => Request,
  isImplementable: (
    query: SyncGrabQuery,
    opts: { flattenConditions: (clauses: Q.Clause[]) => Q.Clause[] }
  ) => boolean
){
  return async function(session: BaseSessionProvider, query: SyncGrabQuery, signal?: AbortSignal): Promise<SyncGrabResponse> {
    if (!isImplementable(query, { flattenConditions })) {
      return {
        kind: 'grab',
        ok: false,
        implemented: false
      }
    }

    const generatedRequest = callback(session)
    const url = serializeGrabUrlQuery(generatedRequest.url, query)
    const request = new Request(url, {
      credentials: 'include',
      headers: generatedRequest.headers,
      signal
    });

    let response: Response | null = null
    try {
      response = await performFetch(request)
    } catch (e) {
      return {
        kind: 'grab',
        ok: false,
        originalError: e
      }
    }

    const json = await response.json() as RawGrabResponse
    const data = deserializeGrabResponse(json)

    const entries = data.entries

    return {
      kind: 'grab',
      ok: true,
      entries
    }
  }
}

export function handlePush(callback: (session: BaseSessionProvider) => Request) {
  return async function(session: BaseSessionProvider, payload: PushPayload, signal?: AbortSignal): Promise<SyncPushResponse> {
    const generatedRequest = callback(session)
    const serverPayload = serializePushPayload(payload)
    const request = new Request(generatedRequest, {
      credentials: 'include',
      body: JSON.stringify(serverPayload),
      signal
    })

    let response: Response | null = null
    try {
      response = await performFetch(request)
    } catch (e) {
      return {
        kind: 'push',
        ok: false,
        originalError: e
      }
    }

    const json = await response.json() as RawPushResponse
    const data = deserializePushResponse(json)

    return {
      kind: 'push',
      ok: true,
      results: data.results
    }
  }
}

async function performFetch(request: Request) {
  const response = await fetch(request)
  const isRetryable = (response.status >= 500 && response.status < 504) || response.status === 429 || response.status === 408

  if (isRetryable) {
    throw new Error(`Server returned ${response.status}`)
  }

  return response
}

function serializePullUrlQuery(url: string, fetchToken: SyncToken | null) {
  const queryString = url.replace(/^[^?]*\??/, '');
  const searchParams = new URLSearchParams(queryString);
  if (fetchToken) {
    searchParams.set('since', fetchToken.toString())
  }
  return url + '?' + searchParams.toString()
}

function deserializePullResponse(response: RawPullResponse) {
  return {
    ...response,
    entries: response.entries.map(entry => {
      return {
        ...entry,
        record: deserializeRecord(entry.record),
        meta: {
          ...entry.meta,
          ids: deserializeIds(entry.meta.ids)
        }
      }
    })
  }
}

function serializeGrabUrlQuery(url: string, query: SyncGrabQuery) {
  const queryString = url.replace(/^[^?]*\??/, '');
  const searchParams = new URLSearchParams(queryString);
  searchParams.set('query', JSON.stringify(query))

  return url + '?' + searchParams.toString()
}

function deserializeGrabResponse(response: RawGrabResponse) {
  return {
    ...response,
    entries: response.entries.map(entry => {
      return {
        ...entry,
        record: deserializeRecord(entry.record),
        meta: {
          ...entry.meta,
          ids: deserializeIds(entry.meta.ids)
        }
      }
    })
  }
}

function serializePushPayload(payload: PushPayload): ServerPushPayload {
  return {
    ...payload,
    entries: payload.entries.map(entry => {
      return {
        record: serializeRecord(entry.record),
        meta: {
          ...entry.meta,
          ids: serializeIds(entry.meta.ids)
        }
      }
    })
  }
}

function deserializePushResponse(response: RawPushResponse) {
  return {
    results: response.results.map(result => {
      if (result.type === 'success') {
        const entry = result.entry

        return {
          ...result,
          entry: {
            ...entry,
            record: deserializeRecord(entry.record),
            meta: {
              ...entry.meta,
              ids: deserializeIds(entry.meta.ids)
            }
          }
        }
      } else {
        return {
          ...result,
          ids: deserializeIds(result.ids)
        }
      }
    })
  }
}

function serializeRecord(record: SyncSyncable<BaseModel, 'id'> | null): SyncSyncable<BaseModel, 'client_record_id'> | null {
  if (record) {
    const { id, ...rest } = record
    return {
      ...rest,
      client_record_id: id
    }
  }

  return null
}

function serializeIds(ids: { id: RecordId }): { client_record_id: RecordId } {
  return {
    client_record_id: ids.id
  }
}

function deserializeRecord(record: SyncSyncable<BaseModel, 'client_record_id'> | null): SyncSyncable<BaseModel, 'id'> | null {
  if (record) {
    const { client_record_id: id, ...rest } = record
    return {
      ...rest,
      id
    }
  }

  return null
}

function deserializeIds(ids: { client_record_id: RecordId }): { id: RecordId } {
  return {
    id: ids.client_record_id
  }
}

function flattenConditions(clauses: Q.Clause[]): Q.Clause[] {
  return clauses.reduce((acc, clause) => {
    if (clause.type === 'and' || clause.type === 'or') {
      return acc.concat(flattenConditions(clause.conditions))
    } else {
      acc.push(clause)
      return acc
    }
  }, [] as Q.Clause[])
}
