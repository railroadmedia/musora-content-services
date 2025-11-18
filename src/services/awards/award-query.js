/**
 * Simple query functions for frontend developers to easily access award progress
 * from local WatermelonDB storage.
 *
 * Usage Examples:
 * ```javascript
 * // Get award status for a course/learning-path/guided-course
 * const status = await getAwardStatusForContent(12345)
 * if (status.hasAwards) {
 *   status.awards.forEach(award => {
 *     console.log(`${award.name}: ${award.progressPercent}% complete`)
 *   })
 * }
 *
 * // Get progress for a specific award
 * const progress = await getAwardProgress('award-123')
 * if (progress?.isCompleted) {
 *   console.log('Award earned!')
 * }
 *
 * // Get all user's awards
 * const allAwards = await getAllUserAwardProgress()
 * const completedCount = allAwards.filter(a => a.isCompleted).length
 * ```
 */

import { awardDefinitions } from './award-definitions'
import db from '../sync/repository-proxy'

/**
 * @typedef {Object} AwardStatus
 * @property {string} awardId - Award ID
 * @property {string} name - Award name
 * @property {string} badgeImage - Badge image URL
 * @property {string} certificateImage - Certificate image URL
 * @property {number} progressPercent - Progress percentage (0-100)
 * @property {boolean} isCompleted - Whether award is completed
 * @property {Date | null} completedAt - Completion date
 * @property {any} [completionData] - Optional completion data
 */

/**
 * @typedef {Object} ContentAwardStatus
 * @property {boolean} hasAwards - Whether content has awards
 * @property {AwardStatus[]} awards - Array of award statuses
 */

/**
 * Get award completion status and progress for any content
 *
 * Works with any content type: courses, learning-paths, guided-courses, etc.
 * Reads from local WatermelonDB cache for instant results.
 *
 * @param {number} contentId - The content ID (e.g., course ID, learning path ID)
 * @returns {Promise<ContentAwardStatus>} Award status including progress percentage and completion state
 *
 * @example
 * ```javascript
 * const status = await getAwardStatusForContent(12345)
 * console.log(`Has awards: ${status.hasAwards}`)
 * status.awards.forEach(award => {
 *   console.log(`${award.name}: ${award.progressPercent}%`)
 * })
 * ```
 */
export async function getAwardStatusForContent(contentId) {
  try {
    // Check if content has associated awards
    const hasAwards = await awardDefinitions.hasAwards(contentId)

    if (!hasAwards) {
      return {
        hasAwards: false,
        awards: []
      }
    }

    // Get award definitions and user progress
    const { definitions, progress } = await db.userAwardProgress.getAwardsForContent(contentId)

    // Map to simple status objects
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

/**
 * Get progress for a specific award by award ID
 *
 * @param {string} awardId - The Sanity award document ID
 * @returns {Promise<{progressPercent: number, isCompleted: boolean, completedAt: Date | null, completionData?: any} | null>} Award progress or null if not found
 *
 * @example
 * ```javascript
 * const progress = await getAwardProgress('award-123')
 * if (progress) {
 *   console.log(`Progress: ${progress.progressPercent}%`)
 *   console.log(`Completed: ${progress.isCompleted}`)
 * }
 * ```
 */
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

/**
 * Get all of the user's award progress (completed and in-progress)
 *
 * Returns a combined list with award definitions and user progress.
 * Useful for awards page or profile displays.
 *
 * @param {Object} [options] - Optional filters
 * @param {boolean} [options.onlyCompleted] - Only return completed awards
 * @param {number} [options.limit] - Limit number of results
 * @returns {Promise<AwardStatus[]>} Array of all awards with progress information
 *
 * @example
 * ```javascript
 * const allAwards = await getAllUserAwardProgress()
 * const completed = allAwards.filter(a => a.isCompleted)
 * const inProgress = allAwards.filter(a => !a.isCompleted && a.progressPercent > 0)
 *
 * console.log(`Completed: ${completed.length}`)
 * console.log(`In Progress: ${inProgress.length}`)
 * ```
 */
export async function getAllUserAwardProgress(options) {
  try {
    // Get user's progress records
    const result = await db.userAwardProgress.getAll({
      onlyCompleted: options?.onlyCompleted,
      limit: options?.limit
    })

    // Get definitions for all awards the user has progress on
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

/**
 * Get only completed awards
 *
 * @param {number} [limit] - Optional limit on number of results
 * @returns {Promise<AwardStatus[]>} Array of completed awards
 *
 * @example
 * ```javascript
 * const completed = await getCompletedAwards()
 * console.log(`You've earned ${completed.length} awards!`)
 * ```
 */
export async function getCompletedAwards(limit) {
  return getAllUserAwardProgress({ onlyCompleted: true, limit })
}

/**
 * Get awards that are in progress (started but not completed)
 *
 * @param {number} [limit] - Optional limit on number of results
 * @returns {Promise<AwardStatus[]>} Array of in-progress awards
 *
 * @example
 * ```javascript
 * const inProgress = await getInProgressAwards()
 * inProgress.forEach(award => {
 *   console.log(`${award.name}: ${award.progressPercent}% complete`)
 * })
 * ```
 */
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

/**
 * Check if user has completed a specific award
 *
 * @param {string} awardId - The award ID to check
 * @returns {Promise<boolean>} True if completed, false otherwise
 *
 * @example
 * ```javascript
 * if (await hasCompletedAward('award-123')) {
 *   console.log('Already earned this award!')
 * }
 * ```
 */
export async function hasCompletedAward(awardId) {
  try {
    return await db.userAwardProgress.hasCompletedAward(awardId)
  } catch (error) {
    console.error(`Failed to check if award ${awardId} is completed:`, error)
    return false
  }
}

/**
 * Get award statistics for the user
 *
 * @returns {Promise<{totalAvailable: number, completedCount: number, inProgressCount: number, completionRate: number}>} Summary statistics about user's awards
 *
 * @example
 * ```javascript
 * const stats = await getAwardStatistics()
 * console.log(`Completed ${stats.completedCount} of ${stats.totalAvailable} awards`)
 * console.log(`Completion rate: ${stats.completionRate}%`)
 * ```
 */
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

/**
 * Build certificate data for display
 * Combines backend user data + Sanity definitions + local completion data
 *
 * @param {number} userAwardProgressId - The user award progress ID from backend
 * @returns {Promise<import('./types').CertificateData>} Complete certificate data including all images and messages
 *
 * @example
 * ```javascript
 * const certificate = await buildCertificateData(402199)
 * console.log(`Certificate for ${certificate.userName}`)
 * console.log(`Award: ${certificate.awardTitle}`)
 * console.log(`Message: ${certificate.popupMessage}`)
 * ```
 */
export { buildCertificateData } from './certificate-builder'

/**
 * Award manager - Core service for award eligibility and granting
 * Use this to check and grant awards when content is completed
 *
 * @example
 * ```javascript
 * import { awardManager } from 'musora-content-services'
 *
 * // Call this after user completes a course/lesson
 * await awardManager.onContentCompleted(courseId)
 * ```
 */
export { awardManager, AwardManager } from './award-manager'

/**
 * Award events - Event system for award notifications
 * Subscribe to these events to show popups and UI updates
 *
 * @example
 * ```javascript
 * import { awardEvents } from 'musora-content-services'
 *
 * awardEvents.on('awardGranted', (payload) => {
 *   showAwardPopup({
 *     title: payload.definition.name,
 *     message: payload.popupMessage,
 *     badge: payload.definition.badge
 *   })
 * })
 * ```
 */
export { awardEvents } from './award-events'

/**
 * Award definitions cache - Access cached award data from Sanity
 */
export { awardDefinitions } from './award-definitions'
