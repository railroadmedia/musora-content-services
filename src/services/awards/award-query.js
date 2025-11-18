import { awardDefinitions } from './award-definitions'
import db from '../sync/repository-proxy'

/**
 * @typedef {Object} AwardStatus
 * @property {string} awardId
 * @property {string} awardTitle
 * @property {string} badge
 * @property {string} award
 * @property {string} brand
 * @property {string} instructorName
 * @property {number} progressPercentage
 * @property {boolean} isCompleted
 * @property {string | null} completedAt
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
        awardTitle: def.name,
        badge: def.badge,
        award: def.award,
        brand: def.brand,
        instructorName: def.instructor_name,
        progressPercentage: userProgress?.progress_percentage ?? 0,
        isCompleted: userProgress?.isCompleted ?? false,
        completedAt: userProgress?.completed_at
          ? new Date(userProgress.completed_at * 1000).toISOString()
          : null,
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

/** @returns {Promise<{progressPercentage: number, isCompleted: boolean, completedAt: string | null, completionData?: any} | null>} */
export async function getAwardProgress(awardId) {
  try {
    const result = await db.userAwardProgress.getByAwardId(awardId)

    if (!result.data) {
      return null
    }

    return {
      progressPercentage: result.data.progress_percentage,
      isCompleted: result.data.progress_percentage === 100 && result.data.completed_at !== null,
      completedAt: result.data.completed_at
        ? new Date(result.data.completed_at * 1000).toISOString()
        : null,
      completionData: result.data.completion_data
    }
  } catch (error) {
    console.error(`Failed to get award progress for ${awardId}:`, error)
    return null
  }
}

/** @returns {Promise<AwardStatus[]>} */
export async function getAllUserAwardProgress(brand = null, options = {}) {
  try {
    const result = await db.userAwardProgress.getAll({
      onlyCompleted: options?.onlyCompleted,
      limit: options?.limit
    })

    const awards = await Promise.all(
      result.data.map(async (progress) => {
        const definition = await awardDefinitions.getById(progress.award_id)

        if (!definition) {
          return null
        }

        if (brand && definition.brand !== brand) {
          return null
        }

        return {
          awardId: progress.award_id,
          awardTitle: definition.name,
          badge: definition.badge,
          award: definition.award,
          brand: definition.brand,
          instructorName: definition.instructor_name,
          progressPercentage: progress.progress_percentage,
          isCompleted: progress.progress_percentage === 100 && progress.completed_at !== null,
          completedAt: progress.completed_at
            ? new Date(progress.completed_at * 1000).toISOString()
            : null,
          completionData: progress.completion_data
        }
      })
    )

    return awards.filter(award => award !== null)
  } catch (error) {
    console.error('Failed to get all user award progress:', error)
    return []
  }
}

/** @returns {Promise<AwardStatus[]>} */
export async function getCompletedAwards(brand = null, options = {}) {
  try {
    const allProgress = await db.userAwardProgress.getAll()
    const completed = allProgress.data.filter(p =>
      p.progress_percentage === 100 && p.completed_at !== null
    )

    let awards = await Promise.all(
      completed.map(async (progress) => {
        const definition = await awardDefinitions.getById(progress.award_id)

        if (!definition) {
          return null
        }

        if (brand && definition.brand !== brand) {
          return null
        }

        return {
          awardId: progress.award_id,
          awardTitle: definition.name,
          badge: definition.badge,
          award: definition.award,
          brand: definition.brand,
          instructorName: definition.instructor_name,
          progressPercentage: progress.progress_percentage,
          isCompleted: true,
          completedAt: new Date(progress.completed_at * 1000).toISOString(),
          completionData: progress.completion_data
        }
      })
    )

    awards = awards.filter(award => award !== null)

    awards.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())

    if (options.limit) {
      const offset = options.offset || 0
      awards = awards.slice(offset, offset + options.limit)
    }

    return awards
  } catch (error) {
    console.error('Failed to get completed awards:', error)
    return []
  }
}

/** @returns {Promise<AwardStatus[]>} */
export async function getInProgressAwards(brand = null, options = {}) {
  try {
    const allProgress = await db.userAwardProgress.getAll()
    const inProgress = allProgress.data.filter(p =>
      p.progress_percentage > 0 && (p.progress_percentage < 100 || p.completed_at === null)
    )

    let awards = await Promise.all(
      inProgress.map(async (progress) => {
        const definition = await awardDefinitions.getById(progress.award_id)

        if (!definition) {
          return null
        }

        if (brand && definition.brand !== brand) {
          return null
        }

        return {
          awardId: progress.award_id,
          awardTitle: definition.name,
          badge: definition.badge,
          award: definition.award,
          brand: definition.brand,
          instructorName: definition.instructor_name,
          progressPercentage: progress.progress_percentage,
          isCompleted: false,
          completedAt: null,
          completionData: progress.completion_data
        }
      })
    )

    awards = awards.filter(award => award !== null)

    awards.sort((a, b) => b.progressPercentage - a.progressPercentage)

    if (options.limit) {
      const offset = options.offset || 0
      awards = awards.slice(offset, offset + options.limit)
    }

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

/** @returns {Promise<{totalAvailable: number, completed: number, inProgress: number, notStarted: number, completionPercentage: number}>} */
export async function getAwardStatistics(brand = null) {
  try {
    let allDefinitions = await awardDefinitions.getAll()

    if (brand) {
      allDefinitions = allDefinitions.filter(def => def.brand === brand)
    }

    const allProgress = await db.userAwardProgress.getAll()

    const completedCount = allProgress.data.filter(p =>
      p.progress_percentage === 100 && p.completed_at !== null
    ).length

    const inProgressCount = allProgress.data.filter(p =>
      p.progress_percentage > 0 && (p.progress_percentage < 100 || p.completed_at === null)
    ).length

    const totalAvailable = allDefinitions.length
    const notStarted = totalAvailable - completedCount - inProgressCount

    return {
      totalAvailable,
      completed: completedCount,
      inProgress: inProgressCount,
      notStarted: notStarted > 0 ? notStarted : 0,
      completionPercentage: totalAvailable > 0
        ? Math.round((completedCount / totalAvailable) * 100 * 10) / 10
        : 0
    }
  } catch (error) {
    console.error('Failed to get award statistics:', error)
    return {
      totalAvailable: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      completionPercentage: 0
    }
  }
}

export { buildCertificateData } from './certificate-builder'
export { awardManager, AwardManager } from './award-manager'
export { awardEvents } from './award-events'
export { awardDefinitions } from './award-definitions'
export { contentProgressObserver } from './content-progress-observer'
