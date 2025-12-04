/**
 * @module Awards
 */

import './types.js'
import { awardDefinitions } from './internal/award-definitions'
import { AwardMessageGenerator } from './internal/message-generator'
import db from '../sync/repository-proxy'

function enhanceCompletionData(completionData) {
  if (!completionData) return null

  return {
    ...completionData,
    message: AwardMessageGenerator.generatePopupMessage(completionData)
  }
}

/**
 * @param {number} contentId - Railcontent ID of the content item
 * @returns {Promise<ContentAwardsResponse>} Status object with award information
 *
 * @example // Check if content has awards
 * const { hasAwards, awards } = await getContentAwards(234567)
 * if (hasAwards) {
 *   awards.forEach(award => {
 *     console.log(`${award.awardTitle}: ${award.progressPercentage}%`)
 *   })
 * }
 *
 * @example // Display award progress on course page
 * const { awards } = await getContentAwards(courseId)
 * return (
 *   <div>
 *     {awards.map(award => (
 *       <AwardProgressBar
 *         key={award.awardId}
 *         title={award.awardTitle}
 *         progress={award.progressPercentage}
 *         badge={award.isCompleted ? award.badge : null}
 *       />
 *     ))}
 *   </div>
 * )
 */
export async function getContentAwards(contentId) {
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
      const completionData = enhanceCompletionData(userProgress?.completion_data)

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
        completionData
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
 * @param {string} [brand=null] - Brand to filter by (drumeo, pianote, guitareo, singeo), or null for all brands
 * @param {AwardPaginationOptions} [options={}] - Optional pagination and filtering
 * @returns {Promise<AwardInfo[]>} Array of completed award objects sorted by completion date
 *
 * @example // Display completed awards gallery
 * const awards = await getCompletedAwards()
 * return (
 *   <AwardsGallery>
 *     <h2>My Achievements ({awards.length})</h2>
 *     {awards.map(award => (
 *       <Badge
 *         key={award.awardId}
 *         image={award.badge}
 *         title={award.awardTitle}
 *         date={new Date(award.completedAt).toLocaleDateString()}
 *       />
 *     ))}
 *   </AwardsGallery>
 * )
 *
 * @example // Paginated awards list
 * const [page, setPage] = useState(0)
 * const pageSize = 12
 * const awards = await getCompletedAwards('drumeo', {
 *   limit: pageSize,
 *   offset: page * pageSize
 * })
 *
 * @example // Filter by brand
 * const pianoAwards = await getCompletedAwards('pianote')
 * console.log(`You've earned ${pianoAwards.length} piano awards!`)
 */
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

        const completionData = enhanceCompletionData(progress.completion_data)

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
          completionData
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

/**
 * @param {string} [brand=null] - Brand to filter by (drumeo, pianote, guitareo, singeo), or null for all brands
 * @param {AwardPaginationOptions} [options={}] - Optional pagination options
 * @returns {Promise<AwardInfo[]>} Array of in-progress award objects sorted by progress
 *
 * @example // Display in-progress awards dashboard
 * const inProgress = await getInProgressAwards()
 * return (
 *   <div>
 *     <h2>Keep Going! ({inProgress.length})</h2>
 *     {inProgress.map(award => (
 *       <ProgressCard
 *         key={award.awardId}
 *         title={award.awardTitle}
 *         progress={award.progressPercentage}
 *         badge={award.badge}
 *       />
 *     ))}
 *   </div>
 * )
 *
 * @example // Show closest to completion
 * const inProgress = await getInProgressAwards(null, { limit: 3 })
 * console.log('Awards closest to completion:')
 * inProgress.forEach(award => {
 *   console.log(`${award.awardTitle}: ${award.progressPercentage}% complete`)
 * })
 *
 * @example // Filter by brand with pagination
 * const guitarAwards = await getInProgressAwards('guitareo', {
 *   limit: 10,
 *   offset: 0
 * })
 */
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

        const completionData = enhanceCompletionData(progress.completion_data)

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
          completionData
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

/**
 * @param {string} [brand=null] - Brand to filter by (drumeo, pianote, guitareo, singeo), or null for all brands
 * @returns {Promise<AwardStatistics>} Statistics object with award counts and completion percentage
 *
 * @example // Display stats widget
 * const stats = await getAwardStatistics('drumeo')
 * return (
 *   <StatsWidget>
 *     <Stat label="Earned" value={stats.completed} />
 *     <Stat label="In Progress" value={stats.inProgress} />
 *     <Stat label="Completion" value={`${stats.completionPercentage}%`} />
 *   </StatsWidget>
 * )
 *
 * @example // Progress bar
 * const stats = await getAwardStatistics()
 * console.log(`${stats.completed}/${stats.totalAvailable} awards earned`)
 * console.log(`${stats.completionPercentage}% complete`)
 */
export async function getAwardStatistics(brand = null) {
  try {
    let allDefinitions = await awardDefinitions.getAll()

    if (brand) {
      allDefinitions = allDefinitions.filter(def => def.brand === brand)
    }

    const definitionIds = new Set(allDefinitions.map(def => def._id))

    const allProgress = await db.userAwardProgress.getAll()
    const filteredProgress = allProgress.data.filter(p => definitionIds.has(p.award_id))

    const completedCount = filteredProgress.filter(p =>
      p.progress_percentage === 100 && p.completed_at !== null
    ).length

    const inProgressCount = filteredProgress.filter(p =>
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
