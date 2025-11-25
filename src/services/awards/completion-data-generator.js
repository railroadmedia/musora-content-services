import { Q } from '@nozbe/watermelondb'

/**
 * @param {string} awardId - Award ID
 * @param {number} courseContentId - Course content ID
 * @returns {Promise<import('./types').CompletionData>} Completion data
 */
export async function generateCompletionData(awardId, courseContentId) {
  const { awardDefinitions } = await import('./award-definitions')
  const db = await import('../sync/repository-proxy')

  const awardDef = await awardDefinitions.getById(awardId)

  if (!awardDef) {
    throw new Error(`Award definition not found: ${awardId}`)
  }

  let childIds = awardDef.child_ids || []

  if (awardDef.has_kickoff && childIds.length > 0) {
    childIds = childIds.slice(1)
  }

  const daysUserPracticed = await calculateDaysUserPracticed(childIds, db.default)
  const practiceMinutes = await calculatePracticeMinutes(childIds, db.default)
  const contentTitle = awardDef.content_title || generateContentTitle(awardDef.name)

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

  if (!db.contentProgress || typeof db.contentProgress.queryAll !== 'function') {
    console.warn('contentProgress repository not available, returning 1 day')
    return 1
  }

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
