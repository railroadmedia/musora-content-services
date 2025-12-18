export interface SanityResponse<T> {
  result: T
  ms: number
  query: string
}

export interface SanityListResponse<T> {
  data: T[]
  total: number
  sort?: string
  offset?: number
  limit?: number
}
