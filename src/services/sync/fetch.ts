import { SyncToken, SyncEntry, SyncSyncable } from "./index"
import { EpochMs } from "."

import { globalConfig } from '../config.js'
import { RecordId } from "@nozbe/watermelondb"
import BaseModel from "./models/Base"
import { BaseSessionProvider } from "./context/providers"

interface RawPullResponse {
  meta: {
    since: EpochMs | null
    max_updated_at: EpochMs | null
    timestamp: EpochMs
  }
  entries: SyncEntry<BaseModel, 'client_record_id'>[]
}

interface RawPushResponse {
  meta: {
    timestamp: EpochMs
  }
  results: SyncStorePushResult<'client_record_id'>[]
}

export type SyncResponse = SyncPushResponse | SyncPullResponse
export type SyncPushResponse = SyncPushSuccessResponse | SyncPushFetchFailureResponse | SyncPushFailureResponse

type SyncPushSuccessResponse = SyncResponseBase & {
  ok: true
  results: SyncStorePushResult[]
}
type SyncPushFetchFailureResponse = SyncResponseBase & {
  ok: false,
  failureType: 'fetch'
  isRetryable: boolean
}
export type SyncPushFailureResponse = SyncResponseBase & {
  ok: false,
  failureType: 'error'
  originalError: Error
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

export type SyncPullResponse = SyncPullSuccessResponse | SyncPullFailureResponse | SyncPullFetchFailureResponse

type SyncPullSuccessResponse = SyncResponseBase & {
  ok: true
  entries: SyncEntry[]
  token: SyncToken
  previousToken: SyncToken | null
}
type SyncPullFetchFailureResponse = SyncResponseBase & {
  ok: false,
  failureType: 'fetch'
  isRetryable: boolean
}
type SyncPullFailureResponse = SyncResponseBase & {
  ok: false,
  failureType: 'error'
  originalError: Error
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
      ...globalConfig.sessionConfig?.token ? {
        'Authorization': `Bearer ${globalConfig.sessionConfig.token}`
      } : {},
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
      response = await fetch(request)
    } catch (e) {
      return {
        ok: false,
        failureType: 'error',
        originalError: e as Error
      }
    }

    if (response.ok === false) {
      return {
        ok: false,
        failureType: 'fetch',
        isRetryable: (response.status >= 500 && response.status < 504) || response.status === 429 || response.status === 408
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
      ok: true,
      entries,
      token,
      previousToken
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
      response = await fetch(request)
    } catch (e) {
      return {
        ok: false,
        failureType: 'error',
        originalError: e as Error
      }
    }

    if (response.ok === false) {
      return {
        ok: false,
        failureType: 'fetch',
        isRetryable: (response.status >= 500 && response.status < 504) || response.status === 429 || response.status === 408
      }
    }

    const json = await response.json() as RawPushResponse
    const data = deserializePushResponse(json)

    return {
      ok: true,
      results: data.results
    }
  }
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
