import { db } from '../sync'
import { Q } from '@nozbe/watermelondb'
import { _recordWatchSession } from '../contentProgress.js'

export const RECORD_OFFLINE_STATUS = ['created', 'updated']

export async function getRecentActivityOffline({ page = 1, limit = 5, tabName = null } = {}): Promise<any> {
  // refactor this to RADFOP

  // do we allow lessons or songs tab? for sure allow ALL tab.

  // get all offline content progress, sorted by created_at, grab ALL, for purposes of pagination.
  // explode into started and completed actions based on created_at and updated_at (with status).
  // iterate through and create list of RADFOP
  // store total count and current page.
  // apply limit -> data.

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
  hierarchy = null,
) {
  return _recordWatchSession(
    contentId,
    mediaLengthSeconds,
    currentSeconds,
    secondsPlayed,
    {
      collection,
      prevSession,
      instrumentId,
      categoryId,
      hierarchy,
    })
}
