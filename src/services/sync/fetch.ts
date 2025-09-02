import { SyncToken, SyncEntry, SyncStorePushResult, SyncSyncable } from "./index"
import { EpochSeconds } from "./utils/epoch.js"

import { globalConfig } from '../config.js'

interface RawPullResponse {
  meta: {
    since: EpochSeconds | null
    max_updated_at: EpochSeconds | null
    timestamp: EpochSeconds
  }
  entries: SyncEntry<'client_record_id'>[]
}

interface RawPushResponse {
  meta: {
    timestamp: EpochSeconds
  }
  results: SyncStorePushResult<'client_record_id'>[]
}

export interface SyncPushResponse {
  results: SyncStorePushResult[]
}

export type SyncPullResponse = SyncPullSuccessResponse | SyncPullFailureResponse

type SyncPullSuccessResponse = SyncPullResponseBase & {
  success: true
  entries: SyncEntry[]
  token: SyncToken
  previousToken: SyncToken | null
}
type SyncPullFailureResponse = SyncPullResponseBase & {
  success: false
}
interface SyncPullResponseBase {

}

export interface PushPayload {
  entries: {
    record: SyncSyncable
    meta: {
      deleted: boolean
    }
  }[]
}

interface ServerPushPayload {
  entries: {
    record: SyncSyncable<'client_record_id'>
    meta: {
      deleted: boolean
    }
  }[]
}

export function handlePull(callback: () => Request) {
  return async function(lastFetchToken: SyncToken | null, signal?: AbortSignal): Promise<SyncPullResponse> {
    const generatedRequest = callback()
    const url = serializePullUrlQuery(generatedRequest.url, lastFetchToken)
    const request = new Request(url, {
      headers: generatedRequest.headers,
      signal
    });
    const response = await fetch(request)

    if (!response.ok) {
      // TODO - error response
      throw new Error(`Failed to fetch sync pull: ${response.statusText}`)
    }

    const json = await response.json() as RawPullResponse
    const data = deserializePullResponse(json)

    // if no max_updated_at, at least use the server's timestamp
    // useful for recording that we have at least tried fetching even though resultset empty
    const token = data.meta.max_updated_at || data.meta.timestamp
    const previousToken = data.meta.since

    const entries = data.entries

    return {
      success: true,
      entries,
      token,
      previousToken
    }
  }
}

export function handlePush(callback: () => Request) {
  return async function(payload: PushPayload, signal?: AbortSignal): Promise<SyncPushResponse> {
    const generatedRequest = callback()
    const serverPayload = serializePushPayload(payload)
    const request = new Request(generatedRequest, {
      body: JSON.stringify(serverPayload),
      signal
    })
    const response = await fetch(request)

    if (!response.ok) {
      // todo - error response
      throw new Error(`Failed to fetch sync push: ${response.statusText}`)
    }

    const json = await response.json() as RawPushResponse
    const data = deserializePushResponse(json)

    return data
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
  // convert server's client_record_id to our canonical id
  return {
    ...response,
    entries: response.entries.map(entry => {
      const { client_record_id: id, ...record } = entry.record
      return {
        ...entry,
        record: {
          ...record,
          id
        },
        meta: {
          ...entry.meta,
          ids: {
            id: entry.meta.ids.client_record_id
          }
        }
      }
    })
  }
}

function serializePushPayload(payload: PushPayload): ServerPushPayload {
  // convert our canonical id to client_record_id
  return {
    ...payload,
    entries: payload.entries.map(entry => {
      const { id, ...record } = entry.record
      return {
        record: {
          ...record,
          client_record_id: id
        },
        meta: entry.meta
      }
    })

  }
}

function deserializePushResponse(response: RawPushResponse) {
  // convert server's client_record_id to our canonical id
  return {
    results: response.results.map(result => {
      if (result.type === 'success') {
        const entry = result.entry
        const { client_record_id: id, ...record } = entry.record
        return {
          ...result,
          entry: {
            ...entry,
            record: {
              ...record,
              id
            },
            meta: {
              ...entry.meta,
              ids: {
                id: entry.meta.ids.client_record_id
              }
            }
          }
        }
      } else {
        return {
          ...result,
          ids: {
            id: result.ids.client_record_id
          }
        }
      }
    })
  }
}

export function makeFetchRequest(input: RequestInfo, init?: RequestInit): () => Request {
  return () => new Request(globalConfig.baseUrl + input, {
    ...init,
    headers: {
      ...init?.headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${globalConfig.sessionConfig.token}`
    }
  })
}
