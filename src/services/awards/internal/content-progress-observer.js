/**
 * 
 */

import { Q } from '@nozbe/watermelondb'
import { awardManager } from './award-manager'
import { awardDefinitions } from './award-definitions'
import { onProgressSaved } from '../../progress-events'


class ContentProgressObserver {
  constructor() {
    this.subscription = null
    this.progressEventUnsubscribe = null
    this.isObserving = false
    this.processingContentIds = new Set()
    this.debounceTimers = new Map()
    this.debounceMs = 50
    this.allChildIds = new Set()
  }

  /** @returns {Promise<() => void>} */
  async start(database) {
    if (this.isObserving) {
      return () => {}
    }

    await awardDefinitions.refresh()
    const allAwards = await awardDefinitions.getAll()

    this.allChildIds.clear()
    for (const award of allAwards) {
      if (award.child_ids) {
        award.child_ids.forEach(childId => this.allChildIds.add(childId))
      }
    }

    if (this.allChildIds.size === 0) {
      return () => {}
    }

    this.progressEventUnsubscribe = onProgressSaved((event) => {
      if (this.allChildIds.has(event.contentId)) {
        console.log(`[ContentProgressObserver] UserContentProgressSaved event: userId=${event.userId}, contentId=${event.contentId}, status=${event.progressStatus}, progress=${event.progressPercent}%, collectionType=${event.collectionType}, collectionId=${event.collectionId}`)
        this.handleProgressChange({
          content_id: event.contentId,
          state: event.progressStatus,
          progress_percent: event.progressPercent,
          collection_type: event.collectionType,
          collection_id: event.collectionId
        })
      }
    })

    this.isObserving = true

    return () => this.stop()
  }

  /** @returns {Promise<void>} */
  async handleProgressChange(progressRecord) {
    try {
      const childContentId = progressRecord.content_id
      const collectionType = progressRecord.collection_type
      const collectionId = progressRecord.collection_id

      if (!collectionType || !collectionId) {
        console.log(`[ContentProgressObserver] No collection context for content ${childContentId}, skipping award checks`)
        return
      }

      const allAwards = await awardDefinitions.getAll()

      const parentAwards = allAwards.filter(award => {
        if (!award.child_ids || !award.child_ids.includes(childContentId)) {
          return false
        }

        const contentTypeMatch = award.content_type === collectionType
        const contentIdMatch = award.content_id === collectionId

        if (!contentTypeMatch || !contentIdMatch) {
          console.log(`[ContentProgressObserver] Skipping award ${award.name}: collection mismatch (expected ${collectionType}:${collectionId}, got ${award.content_type}:${award.content_id})`)
          return false
        }

        return true
      })

      if (parentAwards.length > 0) {
        console.log(`[ContentProgressObserver] Found ${parentAwards.length} matching award(s) for content ${childContentId} in collection ${collectionType}:${collectionId}:`,
          parentAwards.map(a => `${a.name} (${a.content_type}:${a.content_id})`).join(', '))
      } else {
        console.log(`[ContentProgressObserver] No awards found for content ${childContentId} in collection ${collectionType}:${collectionId}`)
      }

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
    if (this.progressEventUnsubscribe) {
      this.progressEventUnsubscribe()
      this.progressEventUnsubscribe = null
    }

    for (const timerId of this.debounceTimers.values()) {
      clearTimeout(timerId)
    }
    this.debounceTimers.clear()
    this.processingContentIds.clear()
    this.allChildIds.clear()

    this.isObserving = false
  }
}


export const contentProgressObserver = new ContentProgressObserver()
