/**
 * @module Awards
 */


/**
 * @param {import('./types').AwardDefinition} award
 * @param {{ type: string; id: number } | null} collection
 * @returns {Promise<import('./types').CompletionData>}
 */
export async function generateCompletionData(award, collection = null) {
  const db = await import('../../sync/repository-proxy')

  const childIds = award.child_ids || []

  const daysUserPracticed = await calculateDaysUserPracticed(childIds, db.default, collection)
  const practiceMinutes = await calculatePracticeMinutes(childIds, db.default)
  const contentTitle = award.content_title || generateContentTitle(award.name)

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
 * @param {{ type: string; id: number } | null} collection
 * @returns {Promise<number>}
 */
async function calculateDaysUserPracticed(contentIds, db, collection = null) {
  if (contentIds.length === 0) return 0

  if (!db.contentProgress || typeof db.contentProgress.getSomeProgressByContentIds !== 'function') {
    console.warn('contentProgress repository not available, returning 1 day')
    return 1
  }

  const progressResult = await db.contentProgress.getSomeProgressByContentIds(contentIds, collection)
  const progressRecords = progressResult.data || []

  if (progressRecords.length === 0) return 0

  const sortedRecords = [...progressRecords].sort((a, b) => a.created_at - b.created_at)
  const earliestRecord = sortedRecords[0]
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
