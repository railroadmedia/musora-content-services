import { onProgressSaved } from '../progress-events'
import { getNextLessonLessonParentTypes, SONG_TYPES_WITH_CHILDREN } from '../../contentTypeConfig.js'
import { STATE } from '../sync/models/ContentProgress'
import { ACTIVITY_TYPE } from '../sync/models/UserActivity'
import { db } from '../sync'


class ContentProgressActivityObserver {
  constructor() {
    this.subscription = null
    this.progressEventUnsubscribe = null
    this.isObserving = false
  }

  /** @returns {Promise<() => void>} */
  async start(database) {
    if (this.isObserving) {
      return () => {}
    }

    this.progressEventUnsubscribe = onProgressSaved((event) => {
      this.handleProgressChange({
        content_id: event.contentId,
        state: event.progressStatus,
        progress_percent: event.progressPercent,
        metadata: event.metadata,
        collection_type: event.collectionType,
        collection_id: event.collectionId
      })
    })

    this.isObserving = true

    return () => this.stop()
  }

  /** @returns {Promise<void>} */
  async handleProgressChange(progressRecord) {
    try {
      if (this.shouldSkip(progressRecord.metadata.type)) {
        return
      }

      const { state, type } = this.extractStateAndType(progressRecord.state, progressRecord.metadata.type)

      const existingActivity = await db.userActivities.queryOneActivity(progressRecord.content_id, state, type)
      if (existingActivity) {
        return
      }

      db.userActivities.record({
        content_id: progressRecord.content_id,
        action: state,
        brand: progressRecord.metadata.brand,
        type,
        date: new Date()
      })
    } catch (error) {
      console.error('[ContentProgressActivityObserver] Error handling progress change:', error)
    }
  }

  shouldSkip(contentType) {
    const EXCLUDED_TYPES = [...getNextLessonLessonParentTypes]
    return EXCLUDED_TYPES.includes(contentType)
  }

  extractStateAndType(progressStatus, contentType) {
    let state
    switch (progressStatus) {
      case STATE.STARTED:
        state = ACTIVITY_TYPE.STARTED
        break
      case STATE.COMPLETED:
        state = ACTIVITY_TYPE.COMPLETED
        break
    }

    if (!state) {
      throw new Error(`Invalid ProgressStatus value: ${progressStatus}`);
    }

    const type = this.getPageType(contentType)

    if (type === 'song') {
      state = ACTIVITY_TYPE.PLAY
    }

    return { state, type }
  }

  getPageType(type) {
    return SONG_TYPES_WITH_CHILDREN.includes(type) ? 'song' : 'lesson'
  }

  stop() {
    if (this.progressEventUnsubscribe) {
      this.progressEventUnsubscribe()
      this.progressEventUnsubscribe = null
    }

    this.isObserving = false
  }
}


export const contentProgressActivityObserver = new ContentProgressActivityObserver()
