import { ContentTypes } from '../../../lib/documents'

export interface FetchByIdOptions {
  type: ContentTypes
  id: number | string
  fields?: string[]
  includeChildren?: boolean
}
