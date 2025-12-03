import { DocumentType } from '../../../lib/documents'

export interface FetchByIdOptions {
  type: DocumentType
  id: number | string
  fields?: string[]
  includeChildren?: boolean
}
