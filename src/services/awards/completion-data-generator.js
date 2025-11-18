import { Q } from '@nozbe/watermelondb'

/**
 * Generate completion data when user earns an award
 * Calculates practice days and minutes from local WatermelonDB data
 *
 * Note: This function requires:
 * - awardDefinitions cache to be initialized
 * - getChildIds function from content service
 * - db.contentProgress and db.contentPractices repositories
 *
 * @param {string} awardId - Award ID
 * @param {number} courseContentId - Course content ID
 * @returns {Promise<import('./types').CompletionData>} Completion data
 */
export async function generateCompletionData(awardId, courseContentId) {
  // Import dynamically to avoid circular dependencies
  const { awardDefinitions } = await import('./award-definitions')
  const { getChildIds } = await import('../content')
  const db = await import('../sync/repository-proxy')

  // 1. Get award definition
  const awardDef = await awardDefinitions.getById(awardId)

  if (!awardDef) {
    throw new Error(`Award definition not found: ${awardId}`)
  }

  // 2. Get all child content IDs for this course
  let childIds = await getChildIds(courseContentId)

  // Exclude kickoff lesson if specified
  if (awardDef.has_kickoff && childIds.length > 0) {
    childIds = childIds.slice(1)
  }

  // 3. Calculate days user practiced (from earliest start to now)
  const daysUserPracticed = await calculateDaysUserPracticed(childIds, db.default)

  // 4. Calculate total practice minutes
  const practiceMinutes = await calculatePracticeMinutes(childIds, db.default)

  // 5. Generate content title
  const contentTitle = generateContentTitle(awardDef.name)

  return {
    content_title: contentTitle,
    completed_at: new Date().toISOString(),
    days_user_practiced: daysUserPracticed,
    practice_minutes: practiceMinutes
  }
}

/**
 * Calculate days between first lesson start and now
 * @param {number[]} contentIds - Array of content IDs
 * @param {any} db - Database repository proxy
 * @returns {Promise<number>} Days practiced
 */
async function calculateDaysUserPracticed(contentIds, db) {
  if (contentIds.length === 0) return 0

  // Get all progress records for these lessons
  const progressRecords = await db.contentProgress.queryAll(
    Q.where('content_id', Q.oneOf(contentIds)),
    Q.sortBy('created_at', Q.asc)
  )

  if (progressRecords.data.length === 0) return 0

  // Get earliest start date (using created_at since started_on may not exist)
  const earliestRecord = progressRecords.data[0]
  const earliestStartDate = earliestRecord.created_at * 1000 // Convert epoch seconds to ms

  // Calculate days from then to now
  const now = Date.now()
  const daysDiff = Math.floor((now - earliestStartDate) / (1000 * 60 * 60 * 24))

  // Return at least 1 day
  return Math.max(daysDiff, 1)
}

/**
 * Calculate total practice minutes from WatermelonDB practice sessions
 * @param {number[]} contentIds - Array of content IDs
 * @param {any} db - Database repository proxy
 * @returns {Promise<number>} Total practice minutes
 */
async function calculatePracticeMinutes(contentIds, db) {
  if (contentIds.length === 0) return 0

  // Check if contentPractices repository exists and has the sumPracticeMinutesForContent method
  if (!db.contentPractices || typeof db.contentPractices.sumPracticeMinutesForContent !== 'function') {
    console.warn('contentPractices repository not available, returning 0 practice minutes')
    return 0
  }

  // Use repository method to sum practice minutes
  const totalMinutes = await db.contentPractices.sumPracticeMinutesForContent(contentIds)

  return totalMinutes
}

/**
 * Generate display title from award name
 * "Complete Blues Foundations Course" → "Blues Foundations"
 * @param {string} awardName - Award name from Sanity
 * @returns {string} Formatted content title
 */
function generateContentTitle(awardName) {
  return awardName
    .replace(/^Complete\s+/i, '')
    .replace(/\s+(Course|Learning Path)$/i, '')
    .trim()
}
