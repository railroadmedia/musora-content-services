import { ContentTypes } from '../../../lib/contentTypes'

export interface FetchByIdOptions {
  type: ContentTypes
  id: number | string
  fields?: string[]
  includeChildren?: boolean
}

