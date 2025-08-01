/**
 * @module UserActivity
 */

import {
  fetchUserPractices,
  logUserPractice,
  fetchUserPracticeMeta,
  fetchUserPracticeNotes,
  fetchHandler,
  fetchRecentUserActivities,
} from './railcontent'
import { DataContext, UserActivityVersionKey } from './dataContext.js'
import { fetchByRailContentIds, fetchShows } from './sanity'
import { fetchPlaylist, fetchUserPlaylists } from './content-org/playlists'
import { pinnedGuidedCourses } from './content-org/guided-courses'
import {
  getMonday,
  getWeekNumber,
  isSameDate,
  isNextDay,
  getTimeRemainingUntilLocal,
  toDayjs,
} from './dateUtils.js'
import { globalConfig } from './config'
import {
  collectionLessonTypes,
  progressTypesMapping,
  recentTypes,
  showsLessonTypes,
  songs,
} from '../contentTypeConfig'
import { getAllStartedOrCompleted, getProgressStateByIds } from './contentProgress'
import { TabResponseType } from '../contentMetaData'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import { addContextToContent } from './contentAggregator.js'

const DATA_KEY_PRACTICES = 'practices'
const DATA_KEY_LAST_UPDATED_TIME = 'u'

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

export async function getUserPractices(userId = globalConfig.sessionConfig.userId) {
  if (userId !== globalConfig.sessionConfig.userId) {
    let data = await fetchUserPractices(0, { userId: userId })
    return data?.['data']?.[DATA_KEY_PRACTICES] ?? {}
  } else {
    let data = await userActivityContext.getData()
    return data?.[DATA_KEY_PRACTICES] ?? {}
  }
}

export let userActivityContext = new DataContext(UserActivityVersionKey, fetchUserPractices)

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
  let data = await userActivityContext.getData()
  let practices = data?.[DATA_KEY_PRACTICES] ?? {}
  let sortedPracticeDays = Object.keys(practices)
    .map((date) => toDayjs(date)) // Convert to dayjs instance
    .sort((a, b) => b.valueOf() - a.valueOf())
  let today = dayjs()
  let startOfWeek = getMonday(today, timeZone) // Get last Monday
  let dailyStats = []
  for (let i = 0; i < 7; i++) {
    const day = startOfWeek.add(i, 'day')
    let hasPractice = sortedPracticeDays.some((practiceDate) =>
      isSameDate(practiceDate, day.format('YYYY-MM-DD'))
    )
    let isActive = isSameDate(today.format(), day.format())
    let type = hasPractice ? 'tracked' : isActive ? 'active' : 'none'
    dailyStats.push({
      key: i,
      label: DAYS[i],
      isActive,
      inStreak: hasPractice,
      type,
      day: day.format('YYYY-MM-DD'),
    })
  }

  let { streakMessage } = getStreaksAndMessage(practices)

  return { data: { dailyActiveStats: dailyStats, streakMessage, practices } }
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
 * Records user practice data and updates both the remote and local activity context.
 *
 * @param {Object} practiceDetails - The details of the practice session.
 * @param {number} practiceDetails.duration_seconds - The duration of the practice session in seconds.
 * @param {boolean} [practiceDetails.auto=true] - Whether the session was automatically logged.
 * @param {number} [practiceDetails.content_id] - The ID of the practiced content (if available).
 * @param {number} [practiceDetails.category_id] - The ID of the associated category (if available).
 * @param {string} [practiceDetails.title] - The title of the practice session (max 64 characters).
 * @param {string} [practiceDetails.thumbnail_url] - The URL of the session's thumbnail (max 255 characters).
 * @returns {Promise<Object>} - A promise that resolves to the response from logging the user practice.
 *
 * @example
 * // Record an auto practice session with content ID
 * recordUserPractice({ content_id: 123, duration_seconds: 300 })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 *
 * @example
 * // Record a custom practice session with additional details
 * recordUserPractice({
 *   duration_seconds: 600,
 *   auto: false,
 *   category_id: 5,
 *   title: "Guitar Warm-up",
 *   thumbnail_url: "https://example.com/thumbnail.jpg",
 *   instrument_id: 1,
 *   instrument_id: 2,
 * })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function recordUserPractice(practiceDetails) {
  practiceDetails.auto = 0
  practiceDetails.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (practiceDetails.content_id) {
    practiceDetails.auto = 1
  }

  await userActivityContext.update(
    async function (localContext) {
      let userData = localContext.data ?? { [DATA_KEY_PRACTICES]: {} }
      localContext.data = userData
    },
    async function () {
      const response = await logUserPractice(practiceDetails)
      if (response) {
        await userActivityContext.updateLocal(async function (localContext) {
          const newPractices = response.data ?? []
          newPractices.forEach((newPractice) => {
            const { date } = newPractice
            if (!localContext.data[DATA_KEY_PRACTICES][date]) {
              localContext.data[DATA_KEY_PRACTICES][date] = []
            }
            localContext.data[DATA_KEY_PRACTICES][date][DATA_KEY_LAST_UPDATED_TIME] = Math.round(
              new Date().getTime() / 1000
            )
            localContext.data[DATA_KEY_PRACTICES][date].push({
              id: newPractice.id,
              duration_seconds: newPractice.duration_seconds, // Add the new practice for this date
            })
          })
        })
      }
      return response
    }
  )
}
/**
 * Updates a user's practice session with new details and syncs the changes remotely.
 *
 * @param {number} id - The unique identifier of the practice session to update.
 * @param {Object} practiceDetails - The updated details of the practice session.
 * @param {number} [practiceDetails.duration_seconds] - The duration of the practice session in seconds.
 * @param {number} [practiceDetails.category_id] - The ID of the associated category (if available).
 * @param {string} [practiceDetails.title] - The title of the practice session (max 64 characters).
 * @param {string} [practiceDetails.thumbnail_url] - The URL of the session's thumbnail (max 255 characters).
 * @returns {Promise<Object>} - A promise that resolves to the response from updating the user practice.
 *
 * @example
 * // Update a practice session's duration
 * updateUserPractice(123, { duration_seconds: 600 })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 *
 * @example
 * // Change a practice session to manual and update its category
 * updateUserPractice(456, { auto: false, category_id: 8 })
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function updateUserPractice(id, practiceDetails) {
  const url = `/api/user/practices/v1/practices/${id}`
  return await fetchHandler(url, 'PUT', null, practiceDetails)
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
  let url = `/api/user/practices/v1/practices${buildQueryString([id])}`
  await userActivityContext.update(
    async function (localContext) {
      if (localContext.data?.[DATA_KEY_PRACTICES]) {
        Object.keys(localContext.data[DATA_KEY_PRACTICES]).forEach((date) => {
          const filtered = localContext.data[DATA_KEY_PRACTICES][date].filter(
            (practice) => practice.id !== id
          )
          if (filtered.length > 0) {
            localContext.data[DATA_KEY_PRACTICES][date] = filtered
          } else {
            delete localContext.data[DATA_KEY_PRACTICES][date]
          }
        })
      }
    },
    async function () {
      return await fetchHandler(url, 'delete')
    }
  )
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
  let url = `/api/user/practices/v1/practices/restore${buildQueryString([id])}`
  const response = await fetchHandler(url, 'put')
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
  const userPracticesIds = await getUserPracticeIds(day)
  if (!userPracticesIds.length) return []

  const url = `/api/user/practices/v1/practices${buildQueryString(userPracticesIds)}`
  await userActivityContext.update(
    async function (localContext) {
      if (localContext.data?.[DATA_KEY_PRACTICES]?.[day]) {
        delete localContext.data[DATA_KEY_PRACTICES][day]
      }
    },
    async function () {
      return await fetchHandler(url, 'DELETE', null)
    }
  )
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
  const response = await fetchHandler(url, 'PUT', null)

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
  const userPracticesIds = await getUserPracticeIds(day, userId)
  if (!userPracticesIds.length) return { data: { practices: [], practiceDuration: 0 } }

  const meta = await fetchUserPracticeMeta(userPracticesIds, userId)
  if (!meta.data.length) return { data: { practices: [], practiceDuration: 0 } }

  const formattedMeta = await formatPracticeMeta(meta.data)
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
export async function getPracticeNotes(day) {
  const notes = await fetchUserPracticeNotes(day)
  return { data: notes }
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
  const contents = await addContextToContent(fetchByRailContentIds, contentIds, {
    addNavigateTo: true,
    addNextLesson: true,
  })
  recentActivityData.data = recentActivityData.data.map((practice) => {
    const content = contents.find((c) => c.id === practice.contentId) || {}
    return {
      ...practice,
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
  const url = `/api/user/practices/v1/notes`
  return await fetchHandler(url, 'POST', null, payload)
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
  const url = `/api/user/practices/v1/notes`
  return await fetchHandler(url, 'PUT', null, payload)
}

function getStreaksAndMessage(practices) {
  let { currentDailyStreak, currentWeeklyStreak, streakMessage } = calculateStreaks(practices, true)

  return {
    currentDailyStreak,
    currentWeeklyStreak,
    streakMessage,
  }
}

async function getUserPracticeIds(day = dayjs().format('YYYY-MM-DD'), userId = null) {
  let practices = {}
  if (userId !== globalConfig.sessionConfig.userId) {
    let data = await fetchUserPractices(0, { userId: userId })
    practices = data?.['data']?.[DATA_KEY_PRACTICES] ?? {}
  } else {
    let data = await userActivityContext.getData()
    practices = data?.[DATA_KEY_PRACTICES] ?? {}
  }
  let userPracticesIds = []
  Object.keys(practices).forEach((date) => {
    if (date === day) {
      practices[date].forEach((practice) => userPracticesIds.push(practice.id))
    }
  })
  return userPracticesIds
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
  const contents = await addContextToContent(fetchByRailContentIds, contentIds, {
    addNavigateTo: true,
    addNextLesson: true,
  })

  return practices.map((practice) => {
    const content = contents ? contents.find((c) => c.id === practice.content_id) : {}

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
  return await fetchHandler(url, 'POST', null, payload)
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
  return await fetchHandler(url, 'DELETE')
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
  return await fetchHandler(url, 'POST')
}


async function extractPinnedItemsAndSortAllItems(
  userPinnedItem,
  contentsMap,
  eligiblePlaylistItems,
  pinnedGuidedCourse,
  limit
) {
  let pinnedItem = await popPinnedItemFromContentsOrPlaylistMap(
    userPinnedItem,
    contentsMap,
    eligiblePlaylistItems
  )

  const guidedCourseID = pinnedGuidedCourse?.content_id
  let combined = []
  if (pinnedGuidedCourse) {
    const guidedCourseContent =
      contentsMap.get(guidedCourseID) ??
      (await addContextToContent(fetchByRailContentId, guidedCourseID, 'guided-course', {
        addNextLesson: true,
        addNavigateTo: true,
        addProgressStatus: true,
        addProgressPercentage: true,
        addProgressTimestamp: true,
      }))
    contentsMap = popContentAndRemoveChildrenFromContentsMap(guidedCourseContent, contentsMap)
    guidedCourseContent.pinned = true
    combined.push(guidedCourseContent)
  }
  if (pinnedItem) {
    pinnedItem.pinned = true
    combined.push(pinnedItem)
  }

  const progressList = Array.from(contentsMap.values())
  combined = [...combined, ...progressList, ...eligiblePlaylistItems]
  return mergeAndSortItems(combined, limit)
}

function generateContentsMap(contents, playlistsContents) {
  const excludedTypes = new Set([
    'pack-bundle',
    'learning-path-course',
    'learning-path-level',
    'guided-course-part',
  ])
  const existingShows = new Set()
  const contentsMap = new Map()
  const childToParentMap = {}
  contents.forEach((content) => {
    if (Array.isArray(content.parent_content_data) && content.parent_content_data.length > 0) {
      childToParentMap[content.id] =
        content.parent_content_data[content.parent_content_data.length - 1]
    }
  })

  const allRecentTypeSet = new Set(Object.values(recentTypes).flat())
  contents.forEach((content) => {
    const id = content.id
    const type = content.type
    if (
      excludedTypes.has(type) ||
      (!allRecentTypeSet.has(type) && !showsLessonTypes.includes(type))
    )
      return
    if (!childToParentMap[id]) {
      // Shows don't have a parent to link them, but need to be handled as if they're a set of children
      if (!existingShows.has(type)) {
        contentsMap.set(id, content)
      }
      if (showsLessonTypes.includes(type)) {
        existingShows.add(type)
      }
    }
  })

  // TODO this doesn't work for guided courses as the GC card takes precedence over the playlist card
  // https://musora.atlassian.net/browse/BEH-812
  if (playlistsContents) {
    for (const item of playlistsContents) {
      const contentId = item.id
      contentsMap.delete(contentId)
      const parentIds = item.parent_content_data || []
      parentIds.forEach((id) => contentsMap.delete(id))
    }
  }
  return contentsMap
}

/**
 * Fetches and combines recent user progress rows and playlists, excluding certain types and parents.
 *
 * @param {Object} [options={}] - Options for fetching progress rows.
 * @param {string|null} [options.brand=null] - The brand context for progress data.
 * @param {number} [options.limit=8] - Maximum number of progress rows to return.
 * @returns {Promise<Object>} - A promise that resolves to an object containing progress rows formatted for UI.
 *
 * @example
 * getProgressRows({ brand: 'drumeo', limit: 10 })
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */
export async function getProgressRows({ brand = null, limit = 8 } = {}) {
  // TODO slice progress to a reasonable number, say 100
  const [recentPlaylists, progressContents, allPinnedGuidedCourse, userPinnedItem] =
    await Promise.all([
      fetchUserPlaylists(brand, { sort: '-last_progress', limit: limit }),
      getAllStartedOrCompleted({ onlyIds: false, brand: brand }),
      pinnedGuidedCourses(brand),
      getUserPinnedItem(brand),
    ])
  let pinnedGuidedCourse = allPinnedGuidedCourse?.[0] ?? null

  const playlists = recentPlaylists?.data || []
  const eligiblePlaylistItems = await getEligiblePlaylistItems(playlists)
  const playlistEngagedOnContents = eligiblePlaylistItems.map(
    (item) => item.playlist.last_engaged_on
  )

  const nonPlaylistContentIds = Object.keys(progressContents)
  if (pinnedGuidedCourse) {
    nonPlaylistContentIds.push(pinnedGuidedCourse.content_id)
  }
  if (userPinnedItem?.progressType === 'content') {
    nonPlaylistContentIds.push(userPinnedItem.id)
  }
  const [playlistsContents, contents] = await Promise.all([
    addContextToContent(fetchByRailContentIds, playlistEngagedOnContents, 'progress-tracker', {
      addNextLesson: true,
      addNavigateTo: true,
      addProgressStatus: true,
      addProgressPercentage: true,
      addProgressTimestamp: true,
    }),
    addContextToContent(fetchByRailContentIds, nonPlaylistContentIds, 'progress-tracker', brand, {
      addNextLesson: true,
      addNavigateTo: true,
      addProgressStatus: true,
      addProgressPercentage: true,
      addProgressTimestamp: true,
    }),
  ])
  const contentsMap = generateContentsMap(contents, playlistsContents)
  let combined = await extractPinnedItemsAndSortAllItems(
    userPinnedItem,
    contentsMap,
    eligiblePlaylistItems,
    pinnedGuidedCourse,
    limit
  )
  const results = await Promise.all(
    combined
      .slice(0, limit)
      .map((item) =>
        item.type === 'playlist' ? processPlaylistItem(item) : processContentItem(item)
      )
  )
  console.log('HomePageProgressRows results: remove before merge', results)
  return {
    type: TabResponseType.PROGRESS_ROWS,
    displayBrowseAll: combined.length > limit,
    data: results,
  }
}

async function getUserPinnedItem(brand) {
  const userRaw = await globalConfig.localStorage.getItem('user')
  const user = userRaw ? JSON.parse(userRaw) : {}
  user.brand_pinned_progress = user.brand_pinned_progress || {}
  return user.brand_pinned_progress[brand] ?? null
}

async function processContentItem(content) {
  const contentType = getFormattedType(content.type, content.brand)
  const isLive = content.isLive ?? false
  let ctaText = getDefaultCTATextForContent(content, contentType)

  content.completed_children = await getCompletedChildren(content, contentType)

  if (content.type === 'guided-course') {
    const nextLessonPublishedOn = content.children.find(
      (child) => child.id === content.navigateTo.id
    )?.published_on
    let isLocked = new Date(nextLessonPublishedOn) > new Date()
    if (isLocked) {
      content.is_locked = true
      const timeRemaining = getTimeRemainingUntilLocal(nextLessonPublishedOn, {
        withTotalSeconds: true,
      })
      content.time_remaining_seconds = timeRemaining.totalSeconds
      ctaText = 'Next lesson in ' + timeRemaining.formatted
    } else if (!content.progressStatus || content.progressStatus === 'not-started') {
      ctaText = 'Start Course'
    }
  }

  if (contentType === 'show') {
    const shows = await fetchShows(content.brand, content.type)
    const showIds = shows.map((item) => item.id)
    const progressOnItems = await getProgressStateByIds(showIds)
    const completedShows = content.completed_children
    const progressTimestamp = content.progressTimestamp
    const wasPinned = content.pinned ?? false
    if (content.progressStatus === 'completed') {
      // this could be handled more gracefully if their was a parent content type for shows
      const nextByProgress = findIncompleteLesson(progressOnItems, content.id, content.type)
      content = shows.find((lesson) => lesson.id === nextByProgress)
      content.completed_children = completedShows
      content.progressTimestamp = progressTimestamp
      content.pinned = wasPinned
    }
    content.child_count = shows.length
    content.progressPercentage = Math.round((completedShows / shows.length) * 100)
    if (completedShows === shows.length) {
      ctaText = 'Revisit Show'
    }
  }

  return {
    id: content.id,
    progressType: 'content',
    header: contentType,
    pinned: content.pinned ?? false,
    content: content,
    body: {
      progressPercent: isLive ? undefined : content.progressPercentage,
      thumbnail: content.thumbnail,
      title: content.title,
      isLive: isLive,
      badge: content.badge ?? null,
      isLocked: content.is_locked ?? false,
      subtitle:
        !content.child_count || content.lesson_count === 1
          ? contentType === 'lesson' && isLive === false
            ? `${content.progressPercentage}% Complete`
            : `${content.difficulty_string} • ${content.artist_name}`
          : `${content.completed_children} of ${content.lesson_count ?? content.child_count} Lessons Complete`,
    },
    cta: {
      text: ctaText,
      timeRemainingToUnlockSeconds: content.time_remaining_seconds ?? null,
      action: {
        type: content.type,
        brand: content.brand,
        id: content.id,
        slug: content.slug,
        child: content.navigateTo,
      },
    },
    // *1000 is to match playlists which are saved in millisecond accuracy
    progressTimestamp: content.progressTimestamp * 1000,
  }
}

function getDefaultCTATextForContent(content, contentType) {
  let ctaText = 'Continue'
  if (content.progressStatus === 'completed') {
    if (
      contentType === songs[content.brand] ||
      contentType === 'play along' ||
      contentType === 'jam track'
    )
      ctaText = 'Replay Song'
    if (contentType === 'lesson') ctaText = 'Revisit Lesson'
    if (contentType === 'song tutorial' || collectionLessonTypes.includes(contentType))
      ctaText = 'Revisit Lessons'
    if (contentType === 'pack') ctaText = 'View Lessons'
  }
  return ctaText
}

async function getCompletedChildren(content, contentType) {
  let completedChildren = null
  if (contentType === 'show') {
    const shows = await addContextToContent(fetchShows, content.brand, content.type, {
      addProgressStatus: true,
    })
    completedChildren = Object.values(shows).filter(
      (show) => show.progressStatus === 'completed'
    ).length
  } else if (content.lesson_count > 0) {
    const lessonIds = getLeafNodes(content)
    const progressOnItems = await getProgressStateByIds(lessonIds)
    completedChildren = Object.values(progressOnItems).filter(
      (value) => value === 'completed'
    ).length
  }
  return completedChildren
}

async function processPlaylistItem(item) {
  const playlist = item.playlist
  return {
    id: playlist.id,
    progressType: 'playlist',
    header: 'playlist',
    pinned: item.pinned ?? false,
    playlist: playlist,
    body: {
      first_items_thumbnail_url: playlist.first_items_thumbnail_url,
      title: playlist.name,
      subtitle: `${playlist.duration_formated} • ${playlist.total_items} items • ${playlist.likes} likes • ${playlist.user.display_name}`,
      total_items: playlist.total_items,
    },
    progressTimestamp: item.progressTimestamp,
    cta: {
      text: 'Continue',
      action: {
        brand: playlist.brand,
        item_id: playlist.navigateTo.id ?? null,
        content_id: playlist.navigateTo.content_id ?? null,
        type: 'playlists',
        // TODO depreciated, maintained to avoid breaking changes
        id: playlist.id,
      },
    },
  }
}

const getFormattedType = (type, brand) => {
  for (const [key, values] of Object.entries(progressTypesMapping)) {
    if (values.includes(type)) {
      return key === 'songs' ? songs[brand] : key
    }
  }

  return null
}

function getLeafNodes(content) {
  const ids = []
  function traverse(children) {
    for (const item of children) {
      if (item.children) {
        traverse(item.children) // Recursively handle nested lessons
      } else if (item.id) {
        ids.push(item.id)
      }
    }
  }
  if (content && Array.isArray(content.children)) {
    traverse(content.children)
  }
  return ids
}

async function getEligiblePlaylistItems(playlists) {
  const eligible = playlists.filter((p) => p.last_progress && p.last_engaged_on)
  return Promise.all(
    eligible.map(async (p) => {
      const utcDate = new Date(p.last_progress.replace(' ', 'T') + 'Z')
      const timestamp = utcDate.getTime()
      return {
        type: 'playlist',
        // Content timestamps are millisecond accurate so for comparison we bring this to the same resolution
        progressTimestamp: timestamp / 1000,
        playlist: p,
        id: p.id,
      }
    })
  )
}

function mergeAndSortItems(items, limit) {
  const seen = new Set()
  const deduped = []

  for (const item of items) {
    const key = `${item.id}-${item.type}`
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(item)
    }
  }

  return deduped
    .filter((item) => typeof item.progressTimestamp === 'number' && item.progressTimestamp >= 0)
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      // TODO pinned guided course should always be before user pinned item
      return b.progressTimestamp - a.progressTimestamp
    })
    .slice(0, limit + 5)
}

export function findIncompleteLesson(progressOnItems, currentContentId, contentType) {
  const ids = Object.keys(progressOnItems).map(Number)
  if (contentType === 'guided-course') {
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

async function popPinnedItemFromContentsOrPlaylistMap(pinned, contentsMap, playlistItems) {
  if (!pinned) return null
  const { id, progressType, pinnedAt } = pinned
  let item = null
  if (progressType === 'content') {
    const pinnedId = parseInt(id)
    if (contentsMap.has(pinnedId)) {
      item = contentsMap.get(pinnedId)
      contentsMap.delete(pinnedId)
    } else {
      // we use fetchByRailContentIds so that we don't have the _type restriction in the query
      let data = await fetchByRailContentIds([id], 'progress-tracker')
      item = await addContextToContent(() => data[0] ?? null, {
        addNextLesson: true,
        addNavigateTo: true,
        addProgressStatus: true,
        addProgressPercentage: true,
        addProgressTimestamp: true,
      })
    }
  }
  if (progressType === 'playlist') {
    const pinnedPlaylist = playlistItems.find((p) => p.playlist.id === id)
    if (pinnedPlaylist) {
      playlistItems = playlistItems.filter((p) => p.playlist.id !== id)
      item = pinnedPlaylist
    } else {
      const playlist = await fetchPlaylist(id)
      item = {
        id: id,
        playlist: playlist,
        type: 'playlist',
        progressTimestamp: new Date(pinnedAt).getTime(),
      }
    }
  }
  return item
}

function popContentAndRemoveChildrenFromContentsMap(content, contentsMap) {
  const children = content.children.map((child) => child.id)
  if (contentsMap.has(content.id)) {
    contentsMap.delete(content.id)
  }
  children.forEach((child) => {
    if (contentsMap.has(child)) {
      contentsMap.delete(child)
    }
  })
  return contentsMap
}

/**
 * Pins a specific progress row for a user, scoped by brand.
 *
 * @param {string} brand - The brand context for the pin action.
 * @param {number|string} id - The ID of the progress item to pin.
 * @param {string} progressType - The type of progress (e.g., 'content', 'playlist').
 * @returns {Promise<Object>} - A promise resolving to the response from the pin API.
 *
 * @example
 * pinProgressRow('drumeo', 12345, 'content')
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function pinProgressRow(brand, id, progressType) {
  const url = `/api/user-management-system/v1/progress/pin?brand=${brand}&id=${id}&progressType=${progressType}`
  const response = await fetchHandler(url, 'PUT', null)
  if (response && !response.error && response['action'] === 'update_user_pin') {
    await updateUserPinnedProgressRow(brand, {
      id,
      progressType,
      pinnedAt: new Date().toISOString(),
    })
  }
  return response
}
/**
 * Unpins the current pinned progress row for a user, scoped by brand.
 *
 * @param {string} brand - The brand context for the unpin action.
 * @param {string} id - The content or playlist id to unpin.
 * @returns {Promise<Object>} - A promise resolving to the response from the unpin API.
 *
 * @example
 * unpinProgressRow('drumeo', 123456)
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function unpinProgressRow(brand, id) {
  if (!(brand && id)) throw new Error(`undefined parameter brand: ${brand} or id: ${id}`)
  const url = `/api/user-management-system/v1/progress/unpin?brand=${brand}&id=${id}`
  const response = await fetchHandler(url, 'PUT', null)
  if (response && !response.error && response['action'] === 'clear_user_pin') {
    await updateUserPinnedProgressRow(brand, null)
  }
  return response
}

async function updateUserPinnedProgressRow(brand, pinnedData) {
  const userRaw = await globalConfig.localStorage.getItem('user')
  const user = userRaw ? JSON.parse(userRaw) : {}
  user.brand_pinned_progress = user.brand_pinned_progress || {}
  user.brand_pinned_progress[brand] = pinnedData
  await globalConfig.localStorage.setItem('user', JSON.stringify(user))
}

export async function fetchRecentActivitiesActiveTabs() {
  const url = `/api/user-management-system/v1/activities/tabs`
  try {
    const tabs = await fetchHandler(url, 'GET')
    const activitiesTabs = []

    tabs.forEach((tab) => {
      activitiesTabs.push({ name: tab.label, short_name: tab.label })
    })

    return activitiesTabs
  } catch (error) {
    console.error('Error fetching activity tabs:', error)
    return []
  }
}
