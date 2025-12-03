/**
 * @module Awards
 */


import { Q } from '@nozbe/watermelondb'

/**
 * @param {string} awardId
 * @param {number} courseContentId
 * @returns {Promise<import('./types').CompletionData>}
 */
export async function generateCompletionData(awardId, courseContentId) {
  const { awardDefinitions } = await import('./award-definitions')
  const db = await import('../../sync/repository-proxy')

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
 * @param {number[]} contentIds
 * @param {any} db
 * @returns {Promise<number>}
 */
async function calculateDaysUserPracticed(contentIds, db) {
  if (contentIds.length === 0) return 0

  if (!db.contentProgress || typeof db.contentProgress.queryAll !== 'function') {
    console.warn('contentProgress repository not available, returning 1 day')
    return 1
  }

  const progressRecords = await db.contentProgress.queryAll(
    Q.where('content_id', Q.oneOf(contentIds)),
    Q.sortBy('created_at', Q.asc)
  )

  if (progressRecords.data.length === 0) return 0

  const earliestRecord = progressRecords.data[0]
  const earliestStartDate = earliestRecord.created_at * 1000

  const now = Date.now()
  const daysDiff = Math.floor((now - earliestStartDate) / (1000 * 60 * 60 * 24))

  return Math.max(daysDiff, 1)
}

/**
 * @param {number[]} contentIds
 * @param {any} db
 * @returns {Promise<number>}
 */
async function calculatePracticeMinutes(contentIds, db) {
  if (contentIds.length === 0) return 0

  if (!db.practices || typeof db.practices.sumPracticeMinutesForContent !== 'function') {
    console.warn('practices repository not available, returning 0 practice minutes')
    return 0
  }

  const totalMinutes = await db.practices.sumPracticeMinutesForContent(contentIds)

  return totalMinutes
}

/**
 * @param {string} awardName
 * @returns {string}
 */
function generateContentTitle(awardName) {
  return awardName
    .replace(/^Complete\s+/i, '')
    .replace(/\s+(Course|Learning Path)$/i, '')
    .trim()
}
