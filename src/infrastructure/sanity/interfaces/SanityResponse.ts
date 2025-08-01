export interface SanityResponse<T = any> {
  result: T
  ms: number
  query: string
} 