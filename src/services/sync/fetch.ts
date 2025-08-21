import { SyncToken, SyncEntry } from "./index"

export interface RawResponse {
  meta: {
    since: SyncToken | null
    max_stamp: SyncToken | null
  }
  records: SyncEntry[]
}

export interface ServerPullResponse {
  data: SyncEntry[]
  token: SyncToken | null
  previousToken: SyncToken | null
}

export function syncPull(callback: (token: SyncToken | null) => Promise<RawResponse>) {
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

export function syncPush(url: string) {
  return async function() {
    const response = await fetch(url)
    return response.json()
  }
}
