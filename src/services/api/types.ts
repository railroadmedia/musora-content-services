export interface PaginatedMeta {
  current_page: number
  from: number
  to: number
  per_page: number
  last_page: number
  total: number
  path: string
}

export interface PaginatedLinks {
  first: string
  last: string
  next: string
  prev: string
}

export interface PaginatedResponse<T> {
  meta: PaginatedMeta
  links: PaginatedLinks
  data: Array<T>
}
