import { awardDefinitions } from './award-definitions'
import { awardEvents } from './award-events'
import { generateCompletionData } from './completion-data-generator'
import { AwardMessageGenerator } from './message-generator'
import db from '../sync/repository-proxy'

/**
 * Award Manager - Core service for award eligibility and granting
 * Implements client-side award detection and message generation
 */
export class AwardManager {
  /**
   * Check if completing this content grants any awards
   * Call this after marking content as completed
   * @param {number} contentId - Content ID that was just completed
   * @returns {Promise<void>}
   */
  async onContentCompleted(contentId) {
    try {
      // Get all awards associated with this content
      const awards = await awardDefinitions.getByContentId(contentId)

      if (awards.length === 0) {
        return
      }

      // Check each award for eligibility
      for (const award of awards) {
        await this.checkAndGrantAward(award, contentId)
      }
    } catch (error) {
      console.error('Error checking awards for completed content:', error)
    }
  }

  /**
   * Check if user is eligible for award and grant if so
   * @private
   * @param {import('./types').AwardDefinition} award - Award definition
   * @param {number} courseContentId - Course content ID
   * @returns {Promise<void>}
   */
  async checkAndGrantAward(award, courseContentId) {
    try {
      // Check if already earned
      const hasCompleted = await db.userAwardProgress.hasCompletedAward(award._id)
      if (hasCompleted) {
        return // Already earned
      }

      // Check eligibility
      const isEligible = await this.checkAwardEligibility(award, courseContentId)

      if (isEligible) {
        // Grant the award
        await this.grantAward(award._id, courseContentId)
      } else {
        // Update progress
        await this.updateAwardProgress(award._id, courseContentId)
      }
    } catch (error) {
      console.error(`Error checking award ${award._id}:`, error)
    }
  }

  /**
   * Check if user is eligible for an award
   * @private
   * @param {import('./types').AwardDefinition} award - Award definition
   * @param {number} courseContentId - Course content ID
   * @returns {Promise<boolean>} True if eligible
   */
  async checkAwardEligibility(award, courseContentId) {
    try {
      // Import dynamically to avoid circular dependencies
      const { getChildIds } = await import('../content')

      // Get all child content IDs for this course
      let childIds = await getChildIds(courseContentId)

      // Exclude kickoff lesson if specified
      if (award.has_kickoff && childIds.length > 0) {
        childIds = childIds.slice(1)
      }

      if (childIds.length === 0) {
        return false
      }

      // Check completion status for each child
      const completionChecks = await Promise.all(
        childIds.map(async (id) => {
          const progress = await db.contentProgress.queryOne(
            Q => Q.where('content_id', id)
          )
          return progress.data?.state === 'completed'
        })
      )

      // All must be completed
      return completionChecks.every(completed => completed)
    } catch (error) {
      console.error('Error checking award eligibility:', error)
      return false
    }
  }

  /**
   * Grant award to user (with client-side generation)
   * @private
   * @param {string} awardId - Award ID
   * @param {number} courseContentId - Course content ID
   * @returns {Promise<void>}
   */
  async grantAward(awardId, courseContentId) {
    // Get award definition
    const definition = await awardDefinitions.getById(awardId)

    if (!definition) {
      console.error(`Award definition not found: ${awardId}`)
      return
    }

    // Generate completion data client-side
    const completionData = await generateCompletionData(
      awardId,
      courseContentId
    )

    // Determine award type
    const awardType = this.determineAwardType(definition)

    // Generate popup message client-side
    const popupMessage = AwardMessageGenerator.generatePopupMessage(
      awardType,
      completionData
    )

    // Save to local DB (instant) and sync to server (background)
    await db.userAwardProgress.completeAward(awardId, completionData)

    // Emit event with generated popup message
    awardEvents.emitAwardGranted({
      awardId,
      definition,
      completionData,
      popupMessage,      // Client-generated message
      timestamp: Date.now()
    })
  }

  /**
   * Update award progress (not yet completed)
   * @private
   * @param {string} awardId - Award ID
   * @param {number} courseContentId - Course content ID
   * @returns {Promise<void>}
   */
  async updateAwardProgress(awardId, courseContentId) {
    try {
      // Import dynamically
      const { getChildIds } = await import('../content')

      const award = await awardDefinitions.getById(awardId)
      if (!award) return

      // Get all child content IDs
      let childIds = await getChildIds(courseContentId)

      if (award.has_kickoff && childIds.length > 0) {
        childIds = childIds.slice(1)
      }

      if (childIds.length === 0) return

      // Count completed
      const completionChecks = await Promise.all(
        childIds.map(async (id) => {
          const progress = await db.contentProgress.queryOne(
            Q => Q.where('content_id', id)
          )
          return progress.data?.state === 'completed'
        })
      )

      const completedCount = completionChecks.filter(Boolean).length
      const progressPercentage = Math.round((completedCount / childIds.length) * 100)

      // Update progress
      await db.userAwardProgress.recordAwardProgress(awardId, progressPercentage)

      // Emit progress event
      awardEvents.emitAwardProgress({
        awardId,
        progressPercentage,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Error updating award progress:', error)
    }
  }

  /**
   * Determine award type from definition
   * @private
   * @param {import('./types').AwardDefinition} definition - Award definition
   * @returns {'guided-course' | 'learning-path'} Award type
   */
  determineAwardType(definition) {
    // Check if name includes "learning path"
    if (definition.name.toLowerCase().includes('learning path')) {
      return 'learning-path'
    }

    // Default to guided-course
    return 'guided-course'
  }

  /**
   * Manually refresh award definitions cache
   * @returns {Promise<void>}
   */
  async refreshDefinitions() {
    await awardDefinitions.refresh()
  }

  /**
   * Clear award definitions cache
   * @returns {void}
   */
  clearDefinitionsCache() {
    awardDefinitions.clear()
  }
}

// Singleton instance
export const awardManager = new AwardManager()
