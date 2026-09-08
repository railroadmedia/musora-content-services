import { COLLECTION_TYPE, CollectionParameter } from '../../sync/models/ContentProgress'

export const filterOutLearningPathsForDuplication = (
  progresses: Record<number, number>,
  collection: CollectionParameter
): Record<number, number> =>
  Object.fromEntries(
    Object.entries(progresses).filter(([id]) => {
      if (collection.type === COLLECTION_TYPE.LEARNING_PATH) {
        return Number(id) !== collection.id
      }
      return true
    })
  )
