export interface SanityResponse<T = any> {
  result: T
  ms: number
  query: string
}

export interface SanityListResponse<T = any> {
  data: T[]
  total: number
}
