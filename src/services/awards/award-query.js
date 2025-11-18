import { awardDefinitions } from './award-definitions'
import db from '../sync/repository-proxy'

/**
 * @typedef {Object} AwardStatus
 * @property {string} awardId
 * @property {string} name
 * @property {string} badgeImage
 * @property {string} certificateImage
 * @property {number} progressPercent
 * @property {boolean} isCompleted
 * @property {Date | null} completedAt
 * @property {any} [completionData]
 */

/**
 * @typedef {Object} ContentAwardStatus
 * @property {boolean} hasAwards
 * @property {AwardStatus[]} awards
 */

/** @returns {Promise<ContentAwardStatus>} */
export async function getAwardStatusForContent(contentId) {
  try {
    const hasAwards = await awardDefinitions.hasAwards(contentId)

    if (!hasAwards) {
      return {
        hasAwards: false,
        awards: []
      }
    }

    const { definitions, progress } = await db.userAwardProgress.getAwardsForContent(contentId)

    const awards = definitions.map(def => {
      const userProgress = progress.get(def._id)

      return {
        awardId: def._id,
        name: def.name,
        badgeImage: def.badge,
        certificateImage: def.award,
        progressPercent: userProgress?.progress_percentage ?? 0,
        isCompleted: userProgress?.isCompleted ?? false,
        completedAt: userProgress?.completedAtDate ?? null,
        completionData: userProgress?.completion_data
      }
    })

    return {
      hasAwards: true,
      awards
    }
  } catch (error) {
    console.error(`Failed to get award status for content ${contentId}:`, error)
    return {
      hasAwards: false,
      awards: []
    }
  }
}

/** @returns {Promise<{progressPercent: number, isCompleted: boolean, completedAt: Date | null, completionData?: any} | null>} */
export async function getAwardProgress(awardId) {
  try {
    const result = await db.userAwardProgress.getByAwardId(awardId)

    if (!result.data) {
      return null
    }

    return {
      progressPercent: result.data.progress_percentage,
      isCompleted: result.data.isCompleted,
      completedAt: result.data.completedAtDate,
      completionData: result.data.completion_data
    }
  } catch (error) {
    console.error(`Failed to get award progress for ${awardId}:`, error)
    return null
  }
}

/** @returns {Promise<AwardStatus[]>} */
export async function getAllUserAwardProgress(options) {
  try {
    const result = await db.userAwardProgress.getAll({
      onlyCompleted: options?.onlyCompleted,
      limit: options?.limit
    })

    const awards = await Promise.all(
      result.data.map(async (progress) => {
        const definition = await awardDefinitions.getById(progress.award_id)

        return {
          awardId: progress.award_id,
          name: definition?.name ?? 'Unknown Award',
          badgeImage: definition?.badge ?? '',
          certificateImage: definition?.award ?? '',
          progressPercent: progress.progress_percentage,
          isCompleted: progress.isCompleted,
          completedAt: progress.completedAtDate,
          completionData: progress.completion_data
        }
      })
    )

    return awards
  } catch (error) {
    console.error('Failed to get all user award progress:', error)
    return []
  }
}

/** @returns {Promise<AwardStatus[]>} */
export async function getCompletedAwards(limit) {
  return getAllUserAwardProgress({ onlyCompleted: true, limit })
}

/** @returns {Promise<AwardStatus[]>} */
export async function getInProgressAwards(limit) {
  try {
    const result = await db.userAwardProgress.getInProgress(limit)

    const awards = await Promise.all(
      result.data.map(async (progress) => {
        const definition = await awardDefinitions.getById(progress.award_id)

        return {
          awardId: progress.award_id,
          name: definition?.name ?? 'Unknown Award',
          badgeImage: definition?.badge ?? '',
          certificateImage: definition?.award ?? '',
          progressPercent: progress.progress_percentage,
          isCompleted: false,
          completedAt: null,
          completionData: progress.completion_data
        }
      })
    )

    return awards
  } catch (error) {
    console.error('Failed to get in-progress awards:', error)
    return []
  }
}

/** @returns {Promise<boolean>} */
export async function hasCompletedAward(awardId) {
  try {
    return await db.userAwardProgress.hasCompletedAward(awardId)
  } catch (error) {
    console.error(`Failed to check if award ${awardId} is completed:`, error)
    return false
  }
}

/** @returns {Promise<{totalAvailable: number, completedCount: number, inProgressCount: number, completionRate: number}>} */
export async function getAwardStatistics() {
  try {
    const allDefinitions = await awardDefinitions.getAll()
    const completed = await db.userAwardProgress.getCompleted()
    const inProgress = await db.userAwardProgress.getInProgress()

    const completedCount = completed.data.length
    const totalAvailable = allDefinitions.length

    return {
      totalAvailable,
      completedCount,
      inProgressCount: inProgress.data.length,
      completionRate: totalAvailable > 0
        ? Math.round((completedCount / totalAvailable) * 100)
        : 0
    }
  } catch (error) {
    console.error('Failed to get award statistics:', error)
    return {
      totalAvailable: 0,
      completedCount: 0,
      inProgressCount: 0,
      completionRate: 0
    }
  }
}

export { buildCertificateData } from './certificate-builder'
export { awardManager, AwardManager } from './award-manager'
export { awardEvents } from './award-events'
export { awardDefinitions } from './award-definitions'
