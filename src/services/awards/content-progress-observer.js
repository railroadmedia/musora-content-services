import { Q } from '@nozbe/watermelondb'
import { awardManager } from './award-manager'
import { awardDefinitions } from './award-definitions'

class ContentProgressObserver {
  constructor() {
    this.subscription = null
    this.isObserving = false
    this.processingContentIds = new Set()
    this.debounceTimers = new Map()
    this.debounceMs = 50
  }

  /** @returns {Promise<() => void>} */
  async start(database) {
    if (this.isObserving) {
      console.warn('[ContentProgressObserver] Already observing')
      return () => {}
    }

    console.log('[ContentProgressObserver] Starting observation')

    await awardDefinitions.refresh()
    const allAwards = await awardDefinitions.getAll()

    const allChildIds = new Set()
    for (const award of allAwards) {
      if (award.child_ids) {
        award.child_ids.forEach(childId => allChildIds.add(childId))
      }
    }

    if (allChildIds.size === 0) {
      console.warn('[ContentProgressObserver] No child content IDs found in awards, not observing')
      return () => {}
    }

    const contentProgressCollection = database.collections.get('content_progress')

    this.subscription = contentProgressCollection
      .query(Q.where('content_id', Q.oneOf(Array.from(allChildIds))))
      .observeWithColumns(['state', 'progress_percent'])
      .subscribe(async (progressRecords) => {
        for (const record of progressRecords) {
          await this.handleProgressChange(record)
        }
      })

    this.isObserving = true

    return () => this.stop()
  }

  /** @returns {Promise<void>} */
  async handleProgressChange(progressRecord) {
    try {
      const childContentId = progressRecord.content_id

      const allAwards = await awardDefinitions.getAll()
      const parentAwards = allAwards.filter(award =>
        award.child_ids && award.child_ids.includes(childContentId)
      )

      for (const award of parentAwards) {
        if (!award.content_id) continue

        this.debounceAwardCheck(award.content_id)
      }
    } catch (error) {
      console.error('[ContentProgressObserver] Error handling progress change:', error)
    }
  }

  debounceAwardCheck(contentId) {
    if (this.debounceTimers.has(contentId)) {
      clearTimeout(this.debounceTimers.get(contentId))
    }

    const timerId = setTimeout(async () => {
      this.debounceTimers.delete(contentId)
      await this.checkAward(contentId)
    }, this.debounceMs)

    this.debounceTimers.set(contentId, timerId)
  }

  /** @returns {Promise<void>} */
  async checkAward(contentId) {
    if (this.processingContentIds.has(contentId)) {
      return
    }

    this.processingContentIds.add(contentId)

    try {
      await awardManager.onContentCompleted(contentId)
    } catch (error) {
      console.error(`[ContentProgressObserver] Error checking award for content ${contentId}:`, error)
    } finally {
      this.processingContentIds.delete(contentId)
    }
  }

  stop() {
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }

    for (const timerId of this.debounceTimers.values()) {
      clearTimeout(timerId)
    }
    this.debounceTimers.clear()
    this.processingContentIds.clear()

    this.isObserving = false
    console.log('[ContentProgressObserver] Stopped observation')
  }
}

export const contentProgressObserver = new ContentProgressObserver()
