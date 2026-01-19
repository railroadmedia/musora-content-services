export interface RequestOptions {
  method: string
  headers: Record<string, string>
  credentials?:  "omit" | "same-origin" | "include"
  body?: string
  cache?: RequestCache
}
