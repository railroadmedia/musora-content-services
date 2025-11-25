import { awardDefinitions } from './award-definitions'
import { awardEvents } from './award-events'
import { generateCompletionData } from './completion-data-generator'
import { AwardMessageGenerator } from './message-generator'
import db from '../sync/repository-proxy'

export class AwardManager {
  /** @returns {Promise<void>} */
  async onContentCompleted(contentId) {
    try {
      const awards = await awardDefinitions.getByContentId(contentId)

      if (awards.length === 0) {
        return
      }

      for (const award of awards) {
        await this.checkAndGrantAward(award, contentId)
      }
    } catch (error) {
      console.error('Error checking awards for completed content:', error)
    }
  }

  /** @returns {Promise<void>} */
  async checkAndGrantAward(award, courseContentId) {
    try {
      const hasCompleted = await db.userAwardProgress.hasCompletedAward(award._id)
      if (hasCompleted) {
        return
      }

      const isEligible = await this.checkAwardEligibility(award, courseContentId)

      if (isEligible) {
        await this.grantAward(award._id, courseContentId)
      } else {
        await this.updateAwardProgress(award._id, courseContentId)
      }
    } catch (error) {
      console.error(`Error checking award ${award._id}:`, error)
    }
  }

  /** @returns {Promise<boolean>} */
  async checkAwardEligibility(award, courseContentId) {
    try {
      let childIds = award.child_ids || []

      if (award.has_kickoff && childIds.length > 0) {
        childIds = childIds.slice(1)
      }

      if (childIds.length === 0) {
        return false
      }

      const completionChecks = await Promise.all(
        childIds.map(async (id) => {
          const progress = await db.contentProgress.queryOne(
            Q => Q.where('content_id', id)
          )
          return progress.data?.state === 'completed'
        })
      )

      return completionChecks.every(completed => completed)
    } catch (error) {
      console.error('Error checking award eligibility:', error)
      return false
    }
  }

  /** @returns {Promise<void>} */
  async grantAward(awardId, courseContentId) {
    const definition = await awardDefinitions.getById(awardId)

    if (!definition) {
      console.error(`Award definition not found: ${awardId}`)
      return
    }

    const completionData = await generateCompletionData(
      awardId,
      courseContentId
    )

    const awardType = this.determineAwardType(definition)

    const popupMessage = AwardMessageGenerator.generatePopupMessage(
      awardType,
      completionData
    )

    await db.userAwardProgress.completeAward(awardId, completionData)

    awardEvents.emitAwardGranted({
      awardId,
      definition,
      completionData,
      popupMessage,
      timestamp: Date.now()
    })
  }

  /** @returns {Promise<void>} */
  async updateAwardProgress(awardId, courseContentId) {
    try {
      const award = await awardDefinitions.getById(awardId)
      if (!award) return

      let childIds = award.child_ids || []

      if (award.has_kickoff && childIds.length > 0) {
        childIds = childIds.slice(1)
      }

      if (childIds.length === 0) return

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

      await db.userAwardProgress.recordAwardProgress(awardId, progressPercentage)

      awardEvents.emitAwardProgress({
        awardId,
        progressPercentage,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Error updating award progress:', error)
    }
  }

  /** @returns {'guided-course' | 'learning-path'} */
  determineAwardType(definition) {
    if (definition.content_type === 'learning-path-v2') {
      return 'learning-path'
    }
    if (definition.content_type === 'guided-course') {
      return 'guided-course'
    }
    console.warn(`Unknown content_type for award: ${definition.content_type}, defaulting to 'guided-course'`)
    return 'guided-course'
  }

  /** @returns {Promise<void>} */
  async refreshDefinitions() {
    await awardDefinitions.refresh()
  }

  clearDefinitionsCache() {
    awardDefinitions.clear()
  }
}

export const awardManager = new AwardManager()
