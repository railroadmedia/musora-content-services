import { RecordId } from "@nozbe/watermelondb"

export interface ServerPullResponse<T = { id: RecordId }> {
  data: T[]
  token: string | null
}

export function syncPull<T>(url: string) {
  return async function(lastFetchToken: string | null): Promise<ServerPullResponse<T>> {
    console.log('syncstore: fetching', url, lastFetchToken)
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('syncstore: fetched', url, lastFetchToken)

    let data = []
    let token = null

    if (url === '/likes') {
      data = [
        { id: '1', content_id: '1', user_id: '1' },
        { id: '2', content_id: '2' },
        { id: '3', content_id: '3' },
      ]
      token = new Date().toISOString()
    }

    return {
      data,
      token
    }
  }
}

export function syncPush(url: string) {
  return async function() {
    const response = await fetch(url)
    return response.json()
  }
}
