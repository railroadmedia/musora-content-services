/**
 * @module UserActivity
 */

import {
  fetchUserPractices,
  fetchUserPracticeMeta,
  fetchRecentUserActivities,
} from './railcontent'
import { GET, POST, PUT, DELETE } from '../infrastructure/http/HttpClient.ts'
import { DataContext, UserActivityVersionKey } from './dataContext.js'
import { fetchByRailContentIds } from './sanity'
import {
  getMonday,
  getWeekNumber,
  isSameDate,
  isNextDay,
} from './dateUtils.js'
import { globalConfig } from './config'
import { getFormattedType } from '../contentTypeConfig'
import dayjs from 'dayjs'
import { addContextToContent } from './contentAggregator.js'
import { db, Q } from './sync'
import {COLLECTION_TYPE} from "./sync/models/ContentProgress";

const DATA_KEY_PRACTICES = 'practices'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const streakMessages = {
  startStreak: 'Start your streak by taking any lesson!',
  restartStreak: 'Restart your streak by taking any lesson!',

  // Messages when last active day is today
  dailyStreak: (streak) =>
    `Nice! You have ${getIndefiniteArticle(streak)} ${streak} day streak! Way to keep it going!`,
  dailyStreakShort: (streak) =>
    `Nice! You have ${getIndefiniteArticle(streak)} ${streak} day streak!`,
  weeklyStreak: (streak) =>
    `You have ${getIndefiniteArticle(streak)} ${streak} week streak! Way to keep up the momentum!`,
  greatJobWeeklyStreak: (streak) =>
    `Great job! You have ${getIndefiniteArticle(streak)} ${streak} week streak! Way to keep it going!`,

  // Messages when last active day is NOT today
  dailyStreakReminder: (streak) =>
    `You have ${getIndefiniteArticle(streak)} ${streak} day streak! Keep it going with any lesson or song!`,
  weeklyStreakKeepUp: (streak) =>
    `You have ${getIndefiniteArticle(streak)} ${streak} week streak! Keep up the momentum!`,
  weeklyStreakReminder: (streak) =>
    `You have ${getIndefiniteArticle(streak)} ${streak} week streak! Keep it going with any lesson or song!`,
}

function getIndefiniteArticle(streak) {
  return streak === 8 || (streak >= 80 && streak <= 89) || (streak >= 800 && streak <= 899)
    ? 'an'
    : 'a'
}

async function getUserPractices(userId) {
  if (userId === globalConfig.sessionConfig.userId) {
    return getOwnPractices()
  } else {
    return await fetchUserPractices(userId)
  }
}

async function getOwnPractices(...clauses) {
  const query = await db.practices.queryAll(...clauses)
  const data = query.data.reduce((acc, practice) => {
    acc[practice.date] = acc[practice.date] || []
    acc[practice.date].push({
      id: practice.id,
      duration_seconds: practice.duration_seconds,
    })
    return acc
  }, {})

  return data
}

export let userActivityContext = new DataContext(UserActivityVersionKey, function() {})

/**
 * Retrieves user activity statistics for the current week, including daily activity and streak messages.
 *
 * @returns {Promise<Object>} - A promise that resolves to an object containing weekly user activity statistics.
 *
 * @example
 * // Retrieve user activity statistics for the current week
 * getUserWeeklyStats()
 *   .then(stats => console.log(stats))
 *   .catch(error => console.error(error));
 */
export async function getUserWeeklyStats() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const today = dayjs()
  const startOfWeek = getMonday(today, timeZone)
  const weekDays = Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day').format('YYYY-MM-DD'))
  // Query THIS WEEK's practices for display
  const weekPractices = await getOwnPractices(
    Q.where('date', Q.oneOf(weekDays)),
    Q.sortBy('date', 'desc')
  )

  // Query LAST 60 DAYS for streak calculation (balances accuracy vs performance)
  // This captures:
  // - Current active streaks up to 60 days
  // - Recent breaks (to show "restart" message)
  // - Sufficient context for accurate weekly streak calculation
  const sixtyDaysAgo = today.subtract(60, 'days').format('YYYY-MM-DD')
  const recentPractices = await getOwnPractices(
    Q.where('date', Q.gte(sixtyDaysAgo)),
    Q.sortBy('date', 'desc')
  )

  const practiceDaysSet = new Set(Object.keys(weekPractices))
  let dailyStats = []
  for (let i = 0; i < 7; i++) {
    const day = startOfWeek.add(i, 'day')
    const dayStr = day.format('YYYY-MM-DD')
    let hasPractice = practiceDaysSet.has(dayStr)
    let isActive = isSameDate(today.format(), dayStr)
    let type = hasPractice ? 'tracked' : isActive ? 'active' : 'none'
    dailyStats.push({
      key: i,
      label: DAYS[i],
      isActive,
      inStreak: hasPractice,
      type,
      day: dayStr,
    })
  }

  let { streakMessage } = getStreaksAndMessage(recentPractices)
  return { data: { dailyActiveStats: dailyStats, streakMessage, practices: weekPractices } }
}

/**
 * Retrieves user activity statistics for a specified month and user, including daily and weekly activity data.
 * If no parameters are provided, defaults to the current year, current month, and the logged-in user.
 *
 * @param {Object} [params={}] - Parameters for fetching user statistics.
 * @param {number} [params.year=new Date().getFullYear()] - The year for which to retrieve the statistics.
 * @param {number} [params.month=new Date().getMonth()] - The 0-based month index (0 = January).
 * @param {number} [params.day=1] - The starting day (not used for grid calc, but kept for flexibility).
 * @param {number} [params.userId=globalConfig.sessionConfig.userId] - The user ID for whom to retrieve stats.
 *
 * @returns {Promise<Object>} A promise that resolves to an object containing:
 * - `dailyActiveStats`: Array of daily activity data for the calendar grid.
 * - `weeklyActiveStats`: Array of weekly streak summaries.
 * - `practiceDuration`: Total number of seconds practiced in the month.
 * - `currentDailyStreak`: Count of consecutive active days.
 * - `currentWeeklyStreak`: Count of consecutive active weeks.
 * - `daysPracticed`: Total number of active days in the month.
 *
 * @example
 * // Get stats for current user and month
 * getUserMonthlyStats().then(console.log);
 *
 * @example
 * // Get stats for March 2024
 * getUserMonthlyStats({ year: 2024, month: 2 }).then(console.log);
 *
 * @example
 * // Get stats for another user
 * getUserMonthlyStats({ userId: 123 }).then(console.log);
 */
export async function getUserMonthlyStats(params = {}) {
  const now = dayjs()
  const {
    year = now.year(),
    month = now.month(), // 0-indexed
    userId = globalConfig.sessionConfig.userId,
  } = params
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const practices = await getUserPractices(userId)

  const firstDayOfMonth = dayjs.tz(`${year}-${month + 1}-01`, timeZone).startOf('day')
  const endOfMonth = firstDayOfMonth.endOf('month')
  const today = dayjs().tz(timeZone).startOf('day')

  let startOfGrid = getMonday(firstDayOfMonth, timeZone)

  // Previous week range
  const previousWeekStart = startOfGrid.subtract(7, 'day')
  const previousWeekEnd = startOfGrid.subtract(1, 'day')

  let hadStreakBeforeMonth = false
  for (let d = previousWeekStart.clone(); d.isSameOrBefore(previousWeekEnd); d = d.add(1, 'day')) {
    const key = d.format('YYYY-MM-DD')
    if (practices[key]) {
      hadStreakBeforeMonth = true
      break
    }
  }

  // let endOfMonth = new Date(year, month + 1, 0)
  let endOfGrid = endOfMonth.clone()
  while (endOfGrid.day() !== 0) {
    endOfGrid = endOfGrid.add(1, 'day')
  }
  const daysInMonth = endOfGrid.diff(startOfGrid, 'day') + 1
  let dailyStats = []
  let practiceDuration = 0
  let daysPracticed = 0
  let weeklyStats = {}

  for (let i = 0; i < daysInMonth; i++) {
    let day = startOfGrid.add(i, 'day')
    let key = day.format('YYYY-MM-DD')
    let activity = practices[key] ?? null
    let weekKey = getWeekNumber(day)

    if (!weeklyStats[weekKey]) {
      weeklyStats[weekKey] = { key: weekKey, inStreak: false }
    }

    if (activity && day.isBetween(firstDayOfMonth, endOfMonth, null, '[]')) {
      practiceDuration += activity.reduce((sum, entry) => sum + entry.duration_seconds, 0)
      daysPracticed++
    }

    if (activity) {
      weeklyStats[weekKey].inStreak = true
    }

    const isActive = day.isSame(today, 'day')
    const type = activity ? 'tracked' : isActive ? 'active' : 'none'

    dailyStats.push({
      key: i,
      label: key,
      isActive,
      inStreak: !!activity,
      type,
    })
  }

  // Continue streak into month
  if (hadStreakBeforeMonth) {
    const firstWeekKey = getWeekNumber(startOfGrid)
    if (weeklyStats[firstWeekKey]) {
      weeklyStats[firstWeekKey].continueStreak = true
    }
  }

  // Filter past practices only
  let filteredPractices = Object.entries(practices)
    .filter(([date]) => dayjs(date).isSameOrBefore(endOfMonth))
    .reduce((acc, [date, val]) => {
      acc[date] = val
      return acc
    }, {})

  const { currentDailyStreak, currentWeeklyStreak } = calculateStreaks(filteredPractices)

  return {
    data: {
      dailyActiveStats: dailyStats,
      weeklyActiveStats: Object.values(weeklyStats),
      practiceDuration,
      currentDailyStreak,
      currentWeeklyStreak,
      daysPracticed,
    },
  }
}

/**
 * Records a manual user practice data, updating the local database and syncing with remote.
 *
 * @param {Object} practiceDetails - The details of the practice session.
 * @param {number} practiceDetails.duration_seconds - The duration of the practice session in seconds.
 * @param {string} [practiceDetails.title] - The title of the practice session (max 64 characters).
 * @param {number} [practiceDetails.category_id] - The ID of the associated category (if available).
 * @param {string} [practiceDetails.thumbnail_url] - The URL of the session's thumbnail (max 255 characters).
 * @param {number} [practiceDetails.instrument_id] - The ID of the associated instrument (if available).
 * @returns {Promise<Object>} - A promise that resolves to the response from logging the user practice.
 *
 * @example
 * // Record a manual practice session with a title
 * recordUserPractice({ title: "Some title", duration_seconds: 300 })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 *
 */
export async function recordUserPractice(practiceDetails) {
  const day = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD wall clock date in user's timezone
  const durationSeconds = practiceDetails.duration_seconds

  return await db.practices.recordManualPractice(day, durationSeconds, {
    title: practiceDetails.title ?? null,
    category_id: practiceDetails.category_id ?? null,
    thumbnail_url: practiceDetails.thumbnail_url ?? null,
    instrument_id: practiceDetails.instrument_id ?? null,
  })
}

export async function trackUserPractice(contentId, incSeconds) {
  const day = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD wall clock date in user's timezone
  return await db.practices.trackAutoPractice(contentId, day, incSeconds);
}

/**
 * Updates a user's practice session with new details and syncs the changes remotely.
 *
 * @param {string} id - The unique identifier of the practice session to update.
 * @param {Object} practiceDetails - The updated details of the practice session.
 * @param {number} [practiceDetails.duration_seconds] - The duration of the practice session in seconds.
 * @param {number} [practiceDetails.category_id] - The ID of the associated category (if available).
 * @param {string} [practiceDetails.title] - The title of the practice session (max 64 characters).
 * @param {string} [practiceDetails.thumbnail_url] - The URL of the session's thumbnail (max 255 characters).
 * @param {number} [practiceDetails.instrument_id] - The ID of the associated instrument (if available).
 * @returns {Promise<Object>} - A promise that resolves to the response from updating the user practice.
 *
 * @example
 * // Update a practice session's duration
 * updateUserPractice(123, { duration_seconds: 600 })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 *
 */
export async function updateUserPractice(id, practiceDetails) {
  return await db.practices.updateDetails(id, practiceDetails)
}

/**
 * Removes a user's practice session by ID, updating both the local and remote activity context.
 *
 * @param {number} id - The unique identifier of the practice session to be removed.
 * @returns {Promise<void>} - A promise that resolves once the practice session is removed.
 *
 * @example
 * // Remove a practice session with ID 123
 * removeUserPractice(123)
 *   .then(() => console.log("Practice session removed successfully"))
 *   .catch(error => console.error(error));
 */
export async function removeUserPractice(id) {
  return await db.practices.deleteOne(id)
}

/**
 * Restores a previously deleted user's practice session by ID, updating both the local and remote activity context.
 *
 * @param {number} id - The unique identifier of the practice session to be restored.
 * @returns {Promise<Object>} - A promise that resolves to the response containing the restored practice session data.
 *
 * @example
 * // Restore a deleted practice session with ID 123
 * restoreUserPractice(123)
 *   .then(response => console.log("Practice session restored:", response))
 *   .catch(error => console.error(error));
 */
export async function restoreUserPractice(id) {
  const url = `/api/user/practices/v1/practices/restore${buildQueryString([id])}`
  const response = await PUT(url, null)
  if (response?.data?.length) {
    const restoredPractice = response.data.find((p) => p.id === id)
    if (restoredPractice) {
      await userActivityContext.updateLocal(async function (localContext) {
        if (!localContext.data[DATA_KEY_PRACTICES][restoredPractice.day]) {
          localContext.data[DATA_KEY_PRACTICES][restoredPractice.day] = []
        }
        response.data.forEach((restoredPractice) => {
          localContext.data[DATA_KEY_PRACTICES][restoredPractice.day].push({
            id: restoredPractice.id,
            duration_seconds: restoredPractice.duration_seconds,
          })
        })
      })
    }
  }
  const formattedMeta = await formatPracticeMeta(response.data || [])
  const practiceDuration = formattedMeta.reduce(
    (total, practice) => total + (practice.duration || 0),
    0
  )
  return {
    data: formattedMeta,
    message: response.message,
    version: response.version,
    practiceDuration,
  }
}

/**
 * Deletes all practice sessions for a specific day.
 *
 * This function retrieves all user practice session IDs for a given day and sends a DELETE request
 * to remove them from the server. It also updates the local context to reflect the deletion.
 *
 * @async
 * @param {string} day - The day (in `YYYY-MM-DD` format) for which practice sessions should be deleted.
 * @returns {Promise<string[]>} - A promise that resolves once the practice session is removed.
 *
 *  * @example
 * // Delete practice sessions for April 10, 2025
 * deletePracticeSession("2025-04-10")
 *   .then(deletedIds => console.log("Deleted sessions:", response))
 *   .catch(error => console.error("Delete failed:", error));
 */
export async function deletePracticeSession(day) {
  const ids = await db.practices.queryAllIds(Q.where('date', day))
  return await db.practices.deleteSome(ids.data)
}

/**
 * Restores deleted practice sessions for a specific date.
 *
 * Sends a PUT request to restore any previously deleted practices for a given date.
 * If restored practices are returned, they are added back into the local context.
 *
 * @async
 * @param {string} date - The date (in `YYYY-MM-DD` format) for which deleted practice sessions should be restored.
 * @returns {Promise<Object>} - The response object from the API, containing practices for selected date.
 *
 * @example
 * // Restore practice sessions deleted on April 10, 2025
 * restorePracticeSession("2025-04-10")
 *   .then(response => console.log("Practice session restored:", response))
 *   .catch(error => console.error("Restore failed:", error));
 */
export async function restorePracticeSession(date) {
  const url = `/api/user/practices/v1/practices/restore?date=${date}`
  const response = await PUT(url, null)

  if (response?.data) {
    await userActivityContext.updateLocal(async function (localContext) {
      if (!localContext.data[DATA_KEY_PRACTICES][date]) {
        localContext.data[DATA_KEY_PRACTICES][date] = []
      }

      response.data.forEach((restoredPractice) => {
        localContext.data[DATA_KEY_PRACTICES][date].push({
          id: restoredPractice.id,
          duration_seconds: restoredPractice.duration_seconds,
        })
      })
    })
  }

  const formattedMeta = await formatPracticeMeta(response?.data)
  const practiceDuration = formattedMeta.reduce(
    (total, practice) => total + (practice.duration || 0),
    0
  )

  return { data: formattedMeta, practiceDuration }
}

/**
 * Retrieves and formats a user's practice sessions for a specific day.
 *
 * @param {Object} params - Parameters for fetching practice sessions.
 * @param {string} params.day - The date for which practice sessions should be retrieved (format: YYYY-MM-DD).
 * @param {number} [params.userId=globalConfig.sessionConfig.userId] - Optional user ID to retrieve sessions for a specific user. Defaults to the logged-in user.
 * @returns {Promise<Object>} - A promise that resolves to an object containing:
 *   - `practices`: An array of formatted practice session data.
 *   - `practiceDuration`: Total practice duration (in seconds) for the given day.
 *
 * @example
 * // Get practice sessions for the current user on a specific day
 * getPracticeSessions({ day: "2025-03-31" })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 *
 * @example
 * // Get practice sessions for another user
 * getPracticeSessions({ day: "2025-03-31", userId: 456 })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function getPracticeSessions(params = {}) {
  const { day, userId = globalConfig.sessionConfig.userId } = params

  let data

  if (userId === globalConfig.sessionConfig.userId) {
    const query = await db.practices.queryAll(
      Q.where('date', day),
      Q.sortBy('created_at', 'asc')
    )
    data = query.data
  } else {
    const query = await fetchUserPracticeMeta(day, userId)
    data = query.data
  }

  if (!data.length) return { data: { practices: [], practiceDuration: 0 } }

  const formattedMeta = await formatPracticeMeta(data)
  const practiceDuration = formattedMeta.reduce(
    (total, practice) => total + (practice.duration || 0),
    0
  )

  return { data: { practices: formattedMeta, practiceDuration } }
}

/**
 * Retrieves user practice notes for a specific day.
 *
 * @async
 * @param {string} day - The day (in `YYYY-MM-DD` format) to fetch practice notes for.
 * @returns {Promise<{ data: Object[] }>} - A promise that resolves to an object containing the practice notes.
 *
 * @example
 * // Get notes for April 10, 2025
 * getPracticeNotes("2025-04-10")
 *   .then(({ data }) => console.log("Practice notes:", data))
 *   .catch(error => console.error("Failed to get notes:", error));
 */
export async function getPracticeNotes(date) {
  return await db.practiceDayNotes.queryOne(Q.where('date', date))
}

/**
 * Retrieves the user's recent activity.
 *
 * Returns an object containing recent practice activity.
 *
 * @async
 * @returns {Promise<{ data: Object[] }>} - A promise that resolves to an object containing recent activity items.
 *
 * @example
 * // Fetch recent practice activity
 * getRecentActivity()
 *   .then(({ data }) => console.log("Recent activity:", data))
 *   .catch(error => console.error("Failed to get recent activity:", error));
 */
export async function getRecentActivity({ page = 1, limit = 5, tabName = null } = {}) {
  const recentActivityData = await fetchRecentUserActivities({ page, limit, tabName })
  const contentIds = recentActivityData.data.map((p) => p.contentId).filter((id) => id !== null)

  const contents = await addContextToContent(
    fetchByRailContentIds,
    contentIds,
    'progress-tracker',
    undefined,
    true,
    { bypassPermissions: true },
    {
      addNavigateTo: true,
      addNextLesson: true,
    }
  )

  recentActivityData.data = recentActivityData.data.map((practice) => {
    const content = contents?.find((c) => c.id === practice.contentId) || {}
    return {
      ...practice,
      thumbnail: content.thumbnail,
      title: content.title,
      parent_id: content.parent_id || null,
      navigateTo: content.navigateTo,
    }
  })
  return recentActivityData
}

/**
 * Creates practice notes for a specific date.
 *
 * @param {Object} payload - The data required to create practice notes.
 * @param {string} payload.date - The date for which to create notes (format: YYYY-MM-DD).
 * @param {string} payload.notes - The notes content to be saved.
 * @returns {Promise<Object>} - A promise that resolves to the API response after creating the notes.
 *
 * @example
 * createPracticeNotes({ date: '2025-04-10', notes: 'Worked on scales and arpeggios' })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function createPracticeNotes(payload) {
  return await db.practiceDayNotes.upsertOne(payload.date, r => {
    r.date = payload.date
    r.notes = payload.notes
  })
}

/**
 * Updates existing practice notes for a specific date.
 *
 * @param {Object} payload - The data required to update practice notes.
 * @param {string} payload.date - The date for which to update notes (format: YYYY-MM-DD).
 * @param {string} payload.notes - The updated notes content.
 * @returns {Promise<Object>} - A promise that resolves to the API response after updating the notes.
 *
 * @example
 * updatePracticeNotes({ date: '2025-04-10', notes: 'Updated: Focused on technique and timing' })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function updatePracticeNotes(payload) {
  return await db.practiceDayNotes.updateOneId(payload.date, r => {
    r.notes = payload.notes
  })
}

function getStreaksAndMessage(practices) {
  let { currentDailyStreak, currentWeeklyStreak, streakMessage } = calculateStreaks(practices, true)

  return {
    currentDailyStreak,
    currentWeeklyStreak,
    streakMessage,
  }
}

function buildQueryString(ids, paramName = 'practice_ids') {
  if (!ids.length) return ''
  return '?' + ids.map((id) => `${paramName}[]=${id}`).join('&')
}

// Helper: Calculate streaks
function calculateStreaks(practices, includeStreakMessage = false) {
  let currentDailyStreak = 0
  let currentWeeklyStreak = 0
  let lastActiveDay = null
  let streakMessage = ''

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  let sortedPracticeDays = Object.keys(practices)
    .map((dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number)
      const newDate = new Date()
      newDate.setFullYear(year, month - 1, day)
      return newDate
    })
    .sort((a, b) => a - b)
  if (sortedPracticeDays.length === 0) {
    return {
      currentDailyStreak: 0,
      currentWeeklyStreak: 0,
      streakMessage: streakMessages.startStreak,
    }
  }
  lastActiveDay = sortedPracticeDays[sortedPracticeDays.length - 1]

  let dailyStreak = 0
  let prevDay = null
  sortedPracticeDays.forEach((currentDay) => {
    if (prevDay === null || isNextDay(prevDay, currentDay)) {
      dailyStreak++
    } else {
      dailyStreak = 1
    }
    prevDay = currentDay
  })
  currentDailyStreak = dailyStreak

  // Weekly streak calculation
  let weekNumbers = new Set(sortedPracticeDays.map((date) => getWeekNumber(date)))
  let weeklyStreak = 0
  let lastWeek = null
  ;[...weekNumbers]
    .sort((a, b) => b - a)
    .forEach((week) => {
      if (lastWeek === null || week === lastWeek - 1) {
        weeklyStreak++
      } else {
        return
      }
      lastWeek = week
    })
  currentWeeklyStreak = weeklyStreak

  // Calculate streak message only if includeStreakMessage is true
  if (includeStreakMessage) {
    let today = new Date()
    let yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    let currentWeekStart = getMonday(today, timeZone)
    let lastWeekStart = currentWeekStart.subtract(7, 'days')

    let hasYesterdayPractice = sortedPracticeDays.some((date) => isSameDate(date, yesterday))
    let hasCurrentWeekPractice = sortedPracticeDays.some((date) => date >= currentWeekStart)
    let hasCurrentWeekPreviousPractice = sortedPracticeDays.some(
      (date) => date >= currentWeekStart && date < today
    )
    let hasLastWeekPractice = sortedPracticeDays.some(
      (date) => date >= lastWeekStart && date < currentWeekStart
    )
    let hasOlderPractice = sortedPracticeDays.some((date) => date < lastWeekStart)

    if (isSameDate(lastActiveDay, today)) {
      if (hasYesterdayPractice) {
        streakMessage = streakMessages.dailyStreak(currentDailyStreak)
      } else if (hasCurrentWeekPreviousPractice) {
        streakMessage = streakMessages.weeklyStreak(currentWeeklyStreak)
      } else if (hasLastWeekPractice) {
        streakMessage = streakMessages.greatJobWeeklyStreak(currentWeeklyStreak)
      } else {
        streakMessage = streakMessages.dailyStreakShort(currentDailyStreak)
      }
    } else {
      if (
        (hasYesterdayPractice && currentDailyStreak >= 2) ||
        (hasYesterdayPractice && sortedPracticeDays.length == 1) ||
        (hasYesterdayPractice && !hasLastWeekPractice && hasOlderPractice)
      ) {
        streakMessage = streakMessages.dailyStreakReminder(currentDailyStreak)
      } else if (hasCurrentWeekPractice) {
        streakMessage = streakMessages.weeklyStreakKeepUp(currentWeeklyStreak)
      } else if (hasLastWeekPractice) {
        streakMessage = streakMessages.weeklyStreakReminder(currentWeeklyStreak)
      } else {
        streakMessage = streakMessages.restartStreak
      }
    }
  }

  return { currentDailyStreak, currentWeeklyStreak, streakMessage }
}

/**
 * Calculates the longest daily, weekly streaks and totalPracticeSeconds from user practice dates.
 * @returns {{ longestDailyStreak: number, longestWeeklyStreak: number, totalPracticeSeconds:number }}
 */
export async function calculateLongestStreaks(userId = globalConfig.sessionConfig.userId) {
  let practices = await getUserPractices(userId)
  let totalPracticeSeconds = 0
  // Calculate total practice duration
  for (const date in practices) {
    for (const entry of practices[date]) {
      totalPracticeSeconds += entry.duration_seconds
    }
  }

  let practiceDates = Object.keys(practices)
    .map((dateStr) => {
      const [y, m, d] = dateStr.split('-').map(Number)
      const newDate = new Date()
      newDate.setFullYear(y, m - 1, d)
      return newDate
    })
    .sort((a, b) => a - b)

  if (!practiceDates || practiceDates.length === 0) {
    return { longestDailyStreak: 0, longestWeeklyStreak: 0, totalPracticeSeconds: 0 }
  }

  // Normalize to Date objects
  const normalizedDates = [
    ...new Set(
      practiceDates.map((d) => {
        const date = new Date(d)
        date.setHours(0, 0, 0, 0)
        return date.getTime()
      })
    ),
  ].sort((a, b) => a - b)

  // ----- Daily Streak -----
  let longestDailyStreak = 1
  let currentDailyStreak = 1
  for (let i = 1; i < normalizedDates.length; i++) {
    const diffInDays = (normalizedDates[i] - normalizedDates[i - 1]) / (1000 * 60 * 60 * 24)
    if (diffInDays === 1) {
      currentDailyStreak++
      longestDailyStreak = Math.max(longestDailyStreak, currentDailyStreak)
    } else {
      currentDailyStreak = 1
    }
  }

  // ----- Weekly Streak -----
  const weekStartDates = [
    ...new Set(
      normalizedDates.map((ts) => {
        const d = new Date(ts)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust to Monday
        d.setDate(diff)
        return d.getTime() // timestamp for Monday
      })
    ),
  ].sort((a, b) => a - b)

  let longestWeeklyStreak = 1
  let currentWeeklyStreak = 1

  for (let i = 1; i < weekStartDates.length; i++) {
    const diffInWeeks = (weekStartDates[i] - weekStartDates[i - 1]) / (1000 * 60 * 60 * 24 * 7)
    if (diffInWeeks === 1) {
      currentWeeklyStreak++
      longestWeeklyStreak = Math.max(longestWeeklyStreak, currentWeeklyStreak)
    } else {
      currentWeeklyStreak = 1
    }
  }

  return {
    longestDailyStreak,
    longestWeeklyStreak,
    totalPracticeSeconds,
  }
}

async function formatPracticeMeta(practices = []) {
  const contentIds = practices.map((p) => p.content_id).filter((id) => id !== null)
  const contents = await addContextToContent(
    fetchByRailContentIds,
    contentIds,
    'progress-tracker',
    undefined,
    true,
    { bypassPermissions: true },
    {
      addNavigateTo: true,
      addNextLesson: true,
    }
  )

  return practices.map((practice) => {
    const content =
      contents && contents.length > 0 ? contents.find((c) => c.id === practice.content_id) : {}

    return {
      id: practice.id,
      auto: practice.auto,
      thumbnail: practice.content_id ? content.thumbnail : practice.thumbnail_url || '',
      thumbnail_url: practice.content_id ? content.thumbnail : practice.thumbnail_url || '',
      duration: practice.duration_seconds || 0,
      duration_seconds: practice.duration_seconds || 0,
      content_url: content?.url || null,
      title: practice.content_id ? content.title : practice.title,
      category_id: practice.category_id,
      instrument_id: practice.instrument_id,
      content_type: getFormattedType(content?.type || '', content?.brand || null),
      content_id: practice.content_id || null,
      content_brand: content?.brand || null,
      created_at: dayjs(practice.created_at),
      sanity_type: content?.type || null,
      content_slug: content?.slug || null,
      parent_id: content?.parent_id || null,
      navigateTo: content?.navigateTo || null,
    }
  })
}

/**
 * Records a new user activity in the system.
 *
 * @param {Object} payload - The data representing the user activity.
 * @param {number} payload.user_id - The ID of the user.
 * @param {string} payload.action - The type of action (e.g., 'start', 'complete', 'comment', etc.).
 * @param {string} payload.brand - The brand associated with the activity.
 * @param {string} payload.type - The content type (e.g., 'lesson', 'song', etc.).
 * @param {number} payload.content_id - The ID of the related content.
 * @param {string} payload.date - The date of the activity (ISO format).
 * @returns {Promise<Object>} - A promise that resolves to the API response after recording the activity.
 *
 * @example
 * recordUserActivity({
 *   user_id: 123,
 *   action: 'start',
 *   brand: 'pianote',
 *   type: 'lesson',
 *   content_id: 4561,
 *   date: '2025-05-15'
 * }).then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function recordUserActivity(payload) {
  const url = `/api/user-management-system/v1/activities`
  return await POST(url, payload)
}

/**
 * Deletes a specific user activity by its ID.
 *
 * @param {number|string} id - The ID of the user activity to delete.
 * @returns {Promise<Object>} - A promise that resolves to the API response after deletion.
 *
 * @example
 * deleteUserActivity(789)
 *   .then(response => console.log('Deleted:', response))
 *   .catch(error => console.error(error));
 */
export async function deleteUserActivity(id) {
  const url = `/api/user-management-system/v1/activities/${id}`
  return await DELETE(url)
}

/**
 * Restores a specific user activity by its ID.
 *
 * @param {number|string} id - The ID of the user activity to restore.
 * @returns {Promise<Object>} - A promise that resolves to the API response after restoration.
 *
 * @example
 * restoreUserActivity(789)
 *   .then(response => console.log('Restored:', response))
 *   .catch(error => console.error(error));
 */
export async function restoreUserActivity(id) {
  const url = `/api/user-management-system/v1/activities/${id}`
  return await POST(url, null)
}

export function findIncompleteLesson(progressOnItems, currentContentId, contentType) {
  const ids = Object.keys(progressOnItems).map(Number)
  if (contentType === 'guided-course' || contentType === COLLECTION_TYPE.LEARNING_PATH) {
    // Return first incomplete lesson
    return ids.find((id) => progressOnItems[id] !== 'completed') || ids.at(0)
  }

  // For other types, find next incomplete after current
  const currentIndex = ids.indexOf(Number(currentContentId))
  if (currentIndex === -1) return null

  for (let i = currentIndex + 1; i < ids.length; i++) {
    const id = ids[i]
    if (progressOnItems[id] !== 'completed') {
      return id
    }
  }

  return ids[0]
}

export async function fetchRecentActivitiesActiveTabs() {
  const url = `/api/user-management-system/v1/activities/tabs`
  const tabs = await GET(url)
  const activitiesTabs = []

  tabs.forEach((tab) => {
    activitiesTabs.push({ name: tab.label, short_name: tab.label })
  })

  return activitiesTabs
}
