import { SyncToken, SyncPullEntry, SyncPushEntry } from "./index"

export interface RawPullResponse {
  meta: {
    since: SyncToken | null
    max_stamp: SyncToken | null
  }
  records: SyncPullEntry[]
}

export interface RawPushResponse {
  records: SyncPushEntry[]
}

export interface ServerPushResponse {
  data: SyncPushEntry[]
}

export interface ServerPullResponse {
  data: SyncPullEntry[]
  token: SyncToken | null
  previousToken: SyncToken | null
}

export function syncPull(callback: (token: SyncToken | null) => Promise<RawPullResponse>) {
  return async function(lastFetchToken: SyncToken | null): Promise<ServerPullResponse> {
    const response = await callback(lastFetchToken)

    const data = response.records
    const previousToken = response.meta.since
    const token = response.meta.max_stamp

    return {
      data,
      token,
      previousToken
    }
  }
}

export function syncPush(callback: (entries: { records: SyncPullEntry[] }) => Promise<RawPushResponse>) {
  return async function(entries: SyncPullEntry[]) {
    const response = await callback({ records: entries })

    const data = response.records

    return {
      data
    }
  }
}
