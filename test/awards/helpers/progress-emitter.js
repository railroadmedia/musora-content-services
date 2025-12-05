import { emitProgressSaved } from '../../../src/services/progress-events'
import { COLLECTION_TYPE } from '../../../src/services/sync/models/ContentProgress'

export const emitProgress = ({
  contentId,
  collectionType = null,
  collectionId = null,
  progressPercent = 100,
  userId = 123
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

export const emitLearningPathProgress = (contentId, learningPathId, progressPercent = 100) => {
  emitProgress({
    contentId,
    collectionType: COLLECTION_TYPE.LEARNING_PATH,
    collectionId: learningPathId,
    progressPercent
  })
}

export const emitAlaCarteProgress = (contentId, progressPercent = 100) => {
  emitProgress({ contentId, progressPercent })
}

export const waitForDebounce = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))
