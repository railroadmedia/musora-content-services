import { db } from '../sync'
import { Q } from '@nozbe/watermelondb'
import { _recordWatchSession } from '../contentProgress.js'
import { CollectionParameter, STATE } from '../sync/models/ContentProgress'
import { lessonRecentTypes, SONG_TYPES } from '../../contentTypeConfig.js'
import dayjs from 'dayjs'
import { getMonday } from '../dateUtils'
import { streakCalculator } from '../user/streakCalculator'
import { _calculateLongestStreaks, _getUserMonthlyStats, _getUserWeeklyStats } from '../userActivity.js'

interface HierarchyParameter {
  topLevelId: number
  parents: { [contentId: number]: [parentId: number] }
  children: { [contentId: number]: [childId: number] }
  metadata: {
    brand: string
    parent_id: number
    type: string
  }
}

interface Activity {
  contentId: number
  action: 'start' | 'complete'
  contentType: 'lesson' | 'song'
  date: string
  brand: string
}

////////////////////////
////       USER ACTIVITY
////////////////////////

export async function getRecentActivityOffline(
  offlineTimestamp: number,
  {
    page = 1,
    limit = 5,
    tabName = null
  }: {
    page: number,
    limit: number,
    tabName: 'lessons'|'songs'|null
  }): Promise<any> {
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
      action: 'start',
      contentType: type,
      date: dayjs(p.created_at).format('YYYY-MM-DD'),
      brand: p.content_brand,
    })
    if (p.state === STATE.COMPLETED) {
      activities.push({
        contentId: p.content_id,
        action: 'complete',
        contentType: type,
        date: dayjs(p.updated_at).format('YYYY-MM-DD'),
        brand: p.content_brand,
      })
    }
  })
  return activities
}


////////////////////////
////           PRACTICES
////////////////////////

async function getOwnPracticesOffline(offlineTimestamp: number, clauses: Q.Clause[] = []) {
  clauses.push(Q.where('updated_at', Q.gte(offlineTimestamp)))
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

export async function getPracticeSessionsOffline(
  offlineTimestamp: number,
  params: { day?: string }) {
  const { day = dayjs().format('YYYY-MM-DD') } = params

  const query = await db.practices.queryAll(
    Q.where('updated_at', Q.gte(offlineTimestamp)),
    Q.where('date', day),
    Q.sortBy('created_at', 'asc'))
  const practices = query.data

  if (!practices.length) return { data: { practices: [], practiceDuration: 0 } }

  const practiceDuration = Math.round(practices.reduce(
    (total, practice) => total + (practice.duration_seconds || 0),
    0
  ))

  return { data: { practices, practiceDuration } }
}

export async function getUserWeeklyStatsOffline(offlineTimestamp: number) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const today = dayjs()
  const startOfWeek = getMonday(today, timeZone)
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    startOfWeek.add(i, 'day').format('YYYY-MM-DD')
  )

  const weekPractices = await getOwnPracticesOffline(
    offlineTimestamp,
    [
      Q.where('date', Q.oneOf(weekDays)),
      Q.sortBy('date', 'desc')
    ]
  )

  const streakData = await streakCalculator.getStreakData()

  return _getUserWeeklyStats(weekPractices, streakData)
}

export async function getUserMonthlyStatsOffline(
  offlineTimestamp: number,
  params: { month?: number, year?: number }
) {
  const practices = await getOwnPracticesOffline(offlineTimestamp)

  const streakData = await streakCalculator.getStreakData()

  return _getUserMonthlyStats(practices, streakData, params)
}

export async function calculateLongestStreaksOffline(offlineTimestamp: number) {
  let practices = await getOwnPracticesOffline(offlineTimestamp)
  return _calculateLongestStreaks(practices)
}


////////////////////////
////    CONTENT PROGRESS
////////////////////////

// progress read endpoints

export async function recordWatchSessionOffline(
  contentId: number,
  mediaLengthSeconds: number,
  currentSeconds: number,
  secondsPlayed: number,
  hierarchy: HierarchyParameter,
  {
    collection = null,
    prevSession = null,
    instrumentId = null,
    categoryId = null,
  }: {
    collection: CollectionParameter|null,
    prevSession: string|null,
    instrumentId: number|null,
    categoryId: number|null
  }
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
