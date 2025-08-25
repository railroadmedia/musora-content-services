import { SyncToken, SyncPullEntry, SyncStorePushResult, ServerPullResponse, ServerPushResponse, ClientPushPayload } from "./index"

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

export function syncPull(callback: (token: SyncToken | null) => Promise<RawPullResponse>) {
  return async function(lastFetchToken: SyncToken | null): Promise<ServerPullResponse> {
    const response = await callback(lastFetchToken)

    const data = response.records
    const previousToken = response.meta.since
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
