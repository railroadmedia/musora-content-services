import { emitProgressSaved } from '../../../src/services/progress-events'

export const COLLECTION_TYPE = {
  LEARNING_PATH: 'learning-path-v2',
  GUIDED_COURSE: 'guided-course'
}

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

export const emitGuidedCourseProgress = (contentId, courseId, progressPercent = 100) => {
  emitProgress({
    contentId,
    collectionType: COLLECTION_TYPE.GUIDED_COURSE,
    collectionId: courseId,
    progressPercent
  })
}

export const emitAlaCarteProgress = (contentId, progressPercent = 100) => {
  emitProgress({ contentId, progressPercent })
}

export const waitForDebounce = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))
