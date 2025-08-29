import { SyncToken, SyncEntry, SyncStorePushResult, SyncSyncable } from "./index"
import { EpochSeconds } from "./utils/brands"

interface RawPullResponse {
  meta: {
    since: EpochSeconds | null
    max_updated_at: EpochSeconds | null
    timestamp: EpochSeconds
  }
  records: SyncEntry<'client_id'>[]
}

interface RawPushResponse {
  meta: {
    timestamp: EpochSeconds
  }
  results: SyncStorePushResult<'client_id'>[]
}

export interface SyncPushResponse {
  results: SyncStorePushResult[]
}

export interface SyncPullResponse {
  data: SyncEntry[]
  token: SyncToken
  previousToken: SyncToken | null
}

export interface ClientPushPayload {
  entries: {
    record: SyncSyncable
    meta: {
      deleted: boolean
    }
  }[]
}

export function syncPull(callback: (token: SyncToken | null, signal?: AbortSignal) => Promise<RawPullResponse>) {
  return async function(lastFetchToken: SyncToken | null, signal?: AbortSignal): Promise<SyncPullResponse> {
    const response = await callback(lastFetchToken, signal)

    const data = response.records.map(entry => {
      const { client_id: id, ...record } = entry.record
      return {
        ...entry,
        record: {
          ...record,
          id
        },
        meta: {
          ...entry.meta,
          ids: {
            id: entry.meta.ids.client_id
          }
        }
      }
    })
    const previousToken = response.meta.since

    // if no max_updated_at, at least use the server's timestamp
    // useful for recording that we have at least tried fetching even though resultset empty
    const token = response.meta.max_updated_at || response.meta.timestamp

    return {
      data,
      token,
      previousToken
    }
  }
}

export function syncPush(callback: (payload: ClientPushPayload, signal?: AbortSignal) => Promise<RawPushResponse>) {
  return async function(payload: ClientPushPayload, signal?: AbortSignal): Promise<SyncPushResponse> {
    const response = await callback(payload, signal)

    const results = response.results

    return {
      results: results.map(result => {
        if (result.success) {
          const entry = result.entry
          const { client_id: id, ...record } = entry.record
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
                  id: entry.meta.ids.client_id
                }
              }
            }
          }
        } else {
          return {
            ...result,
            ids: {
              id: result.ids.client_id
            }
          }
        }
      })
    }
  }
}

