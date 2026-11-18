export interface RequestOptions {
  method: string
  headers: Record<string, string>
  credentials?:  "omit" | "same-origin" | "include"
  body?: string | FormData
  cache?: RequestCache
  /**
   * Lets the request outlive the page that started it. Needed for anything sent
   * during teardown, where a normal request is cancelled as the page unloads.
   */
  keepalive?: boolean
}
