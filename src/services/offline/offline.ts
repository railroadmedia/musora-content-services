import { db } from '../sync'
import { Q } from '@nozbe/watermelondb'
import { recordWatchSession } from '../contentProgress.js'

export const RECORD_OFFLINE_STATUS = ['created', 'updated']

export async function getRecentActivityOffline({ page = 1, limit = 5, tabName = null } = {}): Promise<any> {
  const result = await db.userActivities.getPage(page, limit, { tabName, offline: true })

  return {
    currentPage: result.currentPage,
    totalPages: result.totalPages,
    data: result.data,
  }
}

export async function getOwnPracticesOffline(...clauses: Q.Clause[]) {
  clauses.push(Q.where('_status', Q.oneOf(RECORD_OFFLINE_STATUS)))
  const results = await db.practices.queryAll(...clauses)
  const data = results.data.reduce((acc, practice) => {
    acc[practice.date] = acc[practice.date] || []
    acc[practice.date].push({
      id: practice.id,
      duration_seconds: Math.round(practice.duration_seconds),
    })
    return acc
  }, {})

  return data
}

export async function recordWatchSessionOffline(
  contentId,
  collection = null,
  mediaLengthSeconds,
  currentSeconds,
  secondsPlayed,
  prevSession = null,
  instrumentId = null,
  categoryId = null,
  isLivestream = false
) {
  // return await recordWatchSession(...)
}
