export interface FetchByIdOptions {
  type: string
  id: number | string
  fields?: string[]
  includeChildren?: boolean
} 