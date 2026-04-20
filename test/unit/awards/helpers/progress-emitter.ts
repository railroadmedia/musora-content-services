import { emitProgressSaved } from '../../../../src/services/progress-events.js'
import { COLLECTION_TYPE } from '../../../../src/services/sync/models/ContentProgress'

export { COLLECTION_TYPE }

export const emitProgress = ({
  contentId,
  collectionType = null,
  collectionId = null,
  progressPercent = 100,
  userId = 123
}: {
  contentId: number
  collectionType?: string | null
  collectionId?: number | null
  progressPercent?: number
  userId?: number
}) => {
  emitProgressSaved({
    userId,
    contentId,
    progressPercent,
    progressStatus: progressPercent === 100 ? 'completed' : 'started',
    bubble: true,
    collectionType,
    collectionId,
    resumeTimeSeconds: null,
    timestamp: Date.now()
  })
}

export const emitLearningPathProgress = (contentId: number, learningPathId: number, progressPercent = 100) => {
  emitProgress({
    contentId,
    collectionType: COLLECTION_TYPE.LEARNING_PATH,
    collectionId: learningPathId,
    progressPercent
  })
}

export const emitAlaCarteProgress = (contentId: number, progressPercent = 100) => {
  emitProgress({ contentId, progressPercent })
}

export const waitForDebounce = (ms = 100): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
