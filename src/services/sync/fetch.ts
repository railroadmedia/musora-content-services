import { SyncToken, SyncEntry, SyncStorePushResult, SyncSyncable } from "./index"
import { EpochSeconds } from "./utils/brands"

interface RawPullResponse {
  meta: {
    since: EpochSeconds | null
    max_updated_at: EpochSeconds | null
    timestamp: EpochSeconds
  }
  records: SyncEntry<'client_record_id'>[]
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

export interface SyncPullResponse {
  data: SyncEntry[]
  token: SyncToken
  previousToken: SyncToken | null
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

export function syncPull(callback: (token: SyncToken | null, signal?: AbortSignal) => Promise<RawPullResponse>) {
  return async function(lastFetchToken: SyncToken | null, signal?: AbortSignal): Promise<SyncPullResponse> {
    const response = await callback(lastFetchToken, signal)

    return deserializePullResponse(response)
  }
}

export function syncPush(callback: (serverPayload: ServerPushPayload, signal?: AbortSignal) => Promise<RawPushResponse>) {
  return async function(payload: PushPayload, signal?: AbortSignal): Promise<SyncPushResponse> {
    const serverPayload = serializePushPayload(payload)
    const response = await callback(serverPayload, signal)

    return deserializePushResponse(response);
  }
}

function deserializePullResponse(response: RawPullResponse) {
  // convert server's client_record_id to our canonical id
  const data = response.records.map(entry => {
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

function serializePushPayload(payload: PushPayload) {
  // convert our canonical id to client_record_id
  return {
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
      if (result.success) {
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
