import { awardDefinitions, getEligibleChildIds } from './award-definitions'
import { awardEvents } from './award-events'
import { generateCompletionData } from './completion-data-generator'
import { AwardMessageGenerator } from './message-generator'
import db from '../../sync/repository-proxy'
import { STATE, COLLECTION_TYPE } from '../../sync/models/ContentProgress'
import {getProgressStateByIds} from "../../contentProgress.js";

async function getCompletionStates(contentIds, collection = null) {
  const progress = await getProgressStateByIds(contentIds, collection)

  return contentIds.map(id => {
    return {
      id,
      completed: progress[id] === STATE.COMPLETED
    }
  })
}

function getCollectionFromAward(award) {
  if (award.content_type === COLLECTION_TYPE.LEARNING_PATH && award.content_id) {
    return { type: COLLECTION_TYPE.LEARNING_PATH, id: award.content_id }
  }
  return null
}


export class AwardManager {
  async onContentCompleted(contentId) {
    try {
      const awards = await awardDefinitions.getByContentId(contentId)

      if (awards.length === 0) {
        return
      }

      for (const award of awards) {
        await this.evaluateAward(award)
      }
    } catch (error) {
      console.error('Error checking awards for completed content:', error)
    }
  }

  async evaluateAward(award) {
    try {
      const hasCompleted = await db.userAwardProgress.hasCompletedAward(award._id)
      if (hasCompleted) {
        console.log(`Award ${award._id} already completed, skipping evaluation`)
        return
      }

      const collection = getCollectionFromAward(award)
      const isEligible = await this.checkAwardEligibility(award, collection)

      if (isEligible) {
        console.log(`Award ${award._id} is now eligible, granting award`)
        await this.grantAward(award, collection)
      } else {
        await this.updateAwardProgress(award, collection)
      }
    } catch (error) {
      console.error(`Error checking award ${award._id}:`, error)
    }
  }

  async checkAwardEligibility(award, collection) {
    try {
      const childIds = getEligibleChildIds(award)

      if (childIds.length === 0) {
        return false
      }

      const completionStates = await getCompletionStates(childIds, collection)
      return completionStates.every(state => state.completed)
    } catch (error) {
      console.error('Error checking award eligibility:', error)
      return false
    }
  }

  async grantAward(award, collection) {
    const completionData = await generateCompletionData(award, collection)

    const childIds = getEligibleChildIds(award)
    const completionStates = await getCompletionStates(childIds, collection)

    const completedLessonIds = completionStates
      .filter(state => state.completed)
      .map(state => state.id)

    const progressData = {
      completedLessonIds,
      totalLessons: childIds.length,
      completedCount: completedLessonIds.length
    }

    const popupMessage = AwardMessageGenerator.generatePopupMessage(completionData)

    await db.userAwardProgress.recordAwardProgress(award._id, 100, {
      completedAt: Date.now(),
      completionData,
      progressData,
      immediate: true
    })

    awardEvents.emitAwardGranted({
      awardId: award._id,
      definition: award,
      completionData,
      popupMessage,
      timestamp: Date.now()
    })
  }

  async updateAwardProgress(award, collection) {
    try {
      const childIds = getEligibleChildIds(award)

      if (childIds.length === 0) return

      const completionStates = await getCompletionStates(childIds, collection)

      const completedLessonIds = completionStates
        .filter(state => state.completed)
        .map(state => state.id)

      const completedCount = completedLessonIds.length
      const progressPercentage = Math.round((completedCount / childIds.length) * 100)

      if (progressPercentage === 100) {
        await this.grantAward(award, collection)
        return
      }

      const progressData = {
        completedLessonIds,
        totalLessons: childIds.length,
        completedCount
      }

      await db.userAwardProgress.recordAwardProgress(award._id, progressPercentage, {
        progressData
      })

      awardEvents.emitAwardProgress({
        awardId: award._id,
        progressPercentage,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Error updating award progress:', error)
    }
  }

  async refreshDefinitions() {
    await awardDefinitions.refresh()
  }

  clearDefinitionsCache() {
    awardDefinitions.clear()
  }
}


export const awardManager = new AwardManager()
