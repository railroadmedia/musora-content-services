import {
  COLLECTION_ID_SELF,
  COLLECTION_TYPE,
  CollectionParameter,
} from '../sync/models/ContentProgress'
import type { RecordIdParts } from './types'

export const generateRecordId = (
  contentId: number,
  collection?: CollectionParameter
): string | null => {
  return `${contentId}:${collection?.type || COLLECTION_TYPE.SELF}:${collection?.id || COLLECTION_ID_SELF}`
}

export const extractFromRecordId = (recordId: string): RecordIdParts => {
  const parts = recordId.split(':')
  const contentId = Number(parts[0])
  const collectionType = parts[1]
  const collectionId = Number(parts[2])

  return {
    contentId,
    collection: {
      type: collectionType || COLLECTION_TYPE.SELF,
      id: collectionId || COLLECTION_ID_SELF,
    },
  }
}
