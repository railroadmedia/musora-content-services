/**
 * 
 */

import { awardDefinitions, getEligibleChildIds } from './award-definitions'
import { awardEvents } from './award-events'
import { generateCompletionData } from './completion-data-generator'
import { AwardMessageGenerator } from './message-generator'
import db from '../../sync/repository-proxy'
import { Q } from '@nozbe/watermelondb'

async function getCompletionStates(contentIds) {
  return Promise.all(
    contentIds.map(async (id) => {
      const progress = await db.contentProgress.queryOne(
        Q.where('content_id', id)
      )
      return {
        id,
        completed: progress.data?.state === 'completed'
      }
    })
  )
}


export class AwardManager {
  async onContentCompleted(contentId) {
    try {
      const awards = await awardDefinitions.getByContentId(contentId)

      if (awards.length === 0) {
        return
      }

      for (const award of awards) {
        await this.evaluateAward(award, contentId)
      }
    } catch (error) {
      console.error('Error checking awards for completed content:', error)
    }
  }

  async evaluateAward(award, courseContentId) {
    try {
      const hasCompleted = await db.userAwardProgress.hasCompletedAward(award._id)
      if (hasCompleted) {
        console.log(`Award ${award._id} already completed, skipping evaluation`)
        return
      }

      const isEligible = await this.checkAwardEligibility(award, courseContentId)

      if (isEligible) {
        console.log(`Award ${award._id} is now eligible, granting award`)
        await this.grantAward(award._id, courseContentId)
      } else {
        await this.updateAwardProgress(award._id, courseContentId)
      }
    } catch (error) {
      console.error(`Error checking award ${award._id}:`, error)
    }
  }

  async checkAwardEligibility(award, courseContentId) {
    try {
      const childIds = getEligibleChildIds(award)

      if (childIds.length === 0) {
        return false
      }

      const completionStates = await getCompletionStates(childIds)
      return completionStates.every(state => state.completed)
    } catch (error) {
      console.error('Error checking award eligibility:', error)
      return false
    }
  }

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

    const childIds = getEligibleChildIds(definition)
    const completionStates = await getCompletionStates(childIds)

    const completedLessonIds = completionStates
      .filter(state => state.completed)
      .map(state => state.id)

    const progressData = {
      completedLessonIds,
      totalLessons: childIds.length,
      completedCount: completedLessonIds.length
    }

    const awardType = this.determineAwardType(definition)

    const popupMessage = AwardMessageGenerator.generatePopupMessage(
      awardType,
      completionData
    )

    await db.userAwardProgress.recordAwardProgress(awardId, 100, {
      completedAt: Date.now(),
      completionData,
      progressData,
      immediate: true
    })

    awardEvents.emitAwardGranted({
      awardId,
      definition,
      completionData,
      popupMessage,
      timestamp: Date.now()
    })
  }

  async updateAwardProgress(awardId, courseContentId) {
    try {
      const award = await awardDefinitions.getById(awardId)
      if (!award) return

      const childIds = getEligibleChildIds(award)

      if (childIds.length === 0) return

      const completionStates = await getCompletionStates(childIds)

      const completedLessonIds = completionStates
        .filter(state => state.completed)
        .map(state => state.id)

      const completedCount = completedLessonIds.length
      const progressPercentage = Math.round((completedCount / childIds.length) * 100)

      const progressData = {
        completedLessonIds,
        totalLessons: childIds.length,
        completedCount
      }

      await db.userAwardProgress.recordAwardProgress(awardId, progressPercentage, {
        progressData
      })

      awardEvents.emitAwardProgress({
        awardId,
        progressPercentage,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Error updating award progress:', error)
    }
  }

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

  async refreshDefinitions() {
    await awardDefinitions.refresh()
  }

  clearDefinitionsCache() {
    awardDefinitions.clear()
  }
}


export const awardManager = new AwardManager()
