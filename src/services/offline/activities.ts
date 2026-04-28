import { db } from '../sync'
import { Q } from '@nozbe/watermelondb'
import { STATE } from '../sync/models/ContentProgress'
import { lessonRecentTypes, SONG_TYPES } from '../../contentTypeConfig.js'
import dayjs from 'dayjs'

interface Activity {
  contentId: number
  action: 'Start' | 'Complete'
  contentType: 'lesson' | 'song'
  date: string
  brand: string
}

/**
 * @param offlineTimestamp - Minimum `updated_at` epoch ms to include
 * @param page
 * @param limit
 * @param tabName
 * @param options.page - Page number (default 1)
 * @param options.limit - Results per page (default 5)
 * @param options.tabName - Restrict to `'lessons'`, `'songs'`, or both when `null`
 * @returns {Promise<{currentPage: number, totalPages: number, data: Activity[]}>}
 */
export async function getRecentActivityOffline(
  offlineTimestamp: number,
  {
    page = 1,
    limit = 5,
    tabName = null
  }: {
    page?: number,
    limit?: number,
    tabName?: 'lessons'|'songs'|null
  } = {}): Promise<any> {
  // Note: this is kind of a hack. We're really just getting RADFOP: Recent Activities Derived From Offline Progress,
  // because setting up watermelon user activities table is extremely complicated.
  // Note: this implementation does not persist "activities" beyond when the corresponding record is deleted. That's ok right now.

  const clauses = getClauses(offlineTimestamp, tabName)

  const query = await db.contentProgress.queryAll(...clauses)
  const progress = query.data

  const activities = deriveActivitiesFromProgress(progress)

  const totalPages = Math.ceil(activities.length / limit)
  const currentPage = Math.min(page, totalPages)

  const sorted = activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const data = sorted.slice((currentPage - 1) * limit, currentPage * limit)

  return {
    currentPage,
    totalPages,
    data,
  }
}

function getClauses(offlineTimestamp: number, tabName: string|null) {
  let clauses: Q.Clause[] = [
    Q.where('updated_at', Q.gte(offlineTimestamp)),
    Q.sortBy('created_at', 'desc'),
  ]

  if (tabName === 'lessons') {
    clauses.push(Q.where('content_type', Q.oneOf(lessonRecentTypes)))
  } else if (tabName === 'songs') {
    clauses.push(Q.where('content_type', Q.oneOf(SONG_TYPES)))
  } else {
    clauses.push(Q.where('content_type', Q.oneOf([...lessonRecentTypes, ...SONG_TYPES])))
  }

  return clauses
}

function deriveActivitiesFromProgress(progress: Record<any, any>) {
  const activities: Activity[] = []
  progress.forEach(p => {
    const type = lessonRecentTypes.includes(p.content_type) ? 'lesson' : 'song'

    activities.push({
      contentId: p.content_id,
      action: 'Start',
      contentType: type,
      date: dayjs(p.created_at).toISOString(),
      brand: p.content_brand,
    })
    if (p.state === STATE.COMPLETED) {
      activities.push({
        contentId: p.content_id,
        action: 'Complete',
        contentType: type,
        date: dayjs(p.updated_at).toISOString(),
        brand: p.content_brand,
      })
    }
  })
  return activities
}
