import { SyncToken, SyncPullEntry, SyncStorePushResult, SyncSyncable } from "./index"

interface RawPullResponse {
  meta: {
    since: SyncToken | null
    max_stamp: SyncToken | null
    timestamp: string
  }
  records: SyncPullEntry[]
}

interface RawPushResponse {
  meta: {
    timestamp: string
  }
  results: SyncStorePushResult[]
}

export interface ServerPushResponse {
  results: SyncStorePushResult[]
}

export interface ServerPullResponse {
  data: SyncPullEntry[]
  token: SyncToken | null
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

export function syncPull(callback: (token: SyncToken | null) => Promise<RawPullResponse>) {
  return async function(lastFetchToken: SyncToken | null): Promise<ServerPullResponse> {
    const response = await callback(lastFetchToken)

    const data = response.records
    const previousToken = response.meta.since

    // if no max_stamp, at least use the server's timestamp
    // useful for recording that we have at least tried fetching even though resultset empty
    const token = response.meta.max_stamp || response.meta.timestamp

    return {
      data,
      token,
      previousToken
    }
  }
}

export function syncPush(callback: (payload: ClientPushPayload) => Promise<RawPushResponse>) {
  return async function(payload: ClientPushPayload): Promise<ServerPushResponse> {
    const response = await callback(payload)

    const results = response.results

    return {
      results
    }
  }
}
