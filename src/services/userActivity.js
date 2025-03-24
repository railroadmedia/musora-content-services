/**
 * @module User-Activity
 */

import { fetchUserPractices, logUserPractice } from './railcontent'
import { DataContext, UserActivityVersionKey } from './dataContext.js'
import {fetchByRailContentIds} from "./sanity";

//TODO: remove harcoded data when the PR is approved
const userActivityStats = {
  dailyActiveStats: [
    { label: 'M', isActive: false, inStreak: false, type: 'none' },
    { label: 'T', isActive: false, inStreak: false, type: 'none' },
    { label: 'W', isActive: true, inStreak: true, type: 'tracked' },
    { label: 'T', isActive: true, inStreak: true, type: 'tracked' },
    { label: 'F', isActive: false, inStreak: false, type: 'none' },
    { label: 'S', isActive: true, inStreak: false, type: 'active' },
    { label: 'S', isActive: false, inStreak: false, type: 'none' },
  ],
  currentDailyStreak: 3,
  currentWeeklyStreak: 2,
  streakMessage: 'That\'s 8 weeks in a row! Way to keep your streak going.',
}

const DATA_KEY_PRACTICES = 'practices'
const DATA_KEY_LAST_UPDATED_TIME = 'u'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

//TODO: remove the method when the PR is approved
export async function getUserActivityStats(brand) {
  return userActivityStats
}

export let userActivityContext = new DataContext(UserActivityVersionKey, fetchUserPractices)

// Helper: Get start of the week (Monday)
function getMonday(d) {
  d = new Date(d)
  var day = d.getDay(),
    diff = d.getDate() - day + (day == 0 ? -6 : 1) // adjust when day is sunday
  return new Date(d.setDate(diff))
}

// Helper: Get the week number
function getWeekNumber(date) {
  let startOfYear = new Date(date.getFullYear(), 0, 1)
  let diff = date - startOfYear
  let oneWeekMs = 7 * 24 * 60 * 60 * 1000
  return Math.ceil((diff / oneWeekMs) + startOfYear.getDay() / 7)
}

// Helper: function to check if two dates are consecutive days
function isNextDay(prevDateStr, currentDateStr) {
  let prevDate = new Date(prevDateStr)
  let currentDate = new Date(currentDateStr)
  let diff = (currentDate - prevDate) / (1000 * 60 * 60 * 24)
  return diff === 1
}

// Helper: Calculate streaks
function calculateStreaks(practices) {
  let currentDailyStreak = 0
  let currentWeeklyStreak = 0

  let sortedPracticeDays = Object.keys(practices).sort() // Ensure dates are sorted in order

  if (sortedPracticeDays.length === 0) {
    return { currentDailyStreak: 1, currentWeeklyStreak: 1 }
  }

  let dailyStreak = 0
  let longestDailyStreak = 0
  let prevDay = null

  sortedPracticeDays.forEach((dayKey) => {
    if (prevDay === null || isNextDay(prevDay, dayKey)) {
      dailyStreak++
      longestDailyStreak = Math.max(longestDailyStreak, dailyStreak)
    } else {
      dailyStreak = 1 // Reset streak if there's a gap
    }
    prevDay = dayKey
  })

  currentDailyStreak = dailyStreak

  // Calculate weekly streaks
  let weeklyStreak = 0
  let prevWeek = null
  let currentWeekActivity = false

  sortedPracticeDays.forEach((dayKey) => {
    let date = new Date(dayKey)
    let weekNumber = getWeekNumber(date)

    if (prevWeek === null) {
      prevWeek = weekNumber
      currentWeekActivity = true
    } else if (weekNumber !== prevWeek) {
      // A new week has started
      if (currentWeekActivity) {
        weeklyStreak++
        currentWeekActivity = false
      }
      prevWeek = weekNumber
    }

    if (practices[dayKey]) {
      currentWeekActivity = true
    }
  })

  // If the user has activity in the current week, count it
  if (currentWeekActivity) {
    weeklyStreak++
  }

  currentWeeklyStreak = weeklyStreak

  return { currentDailyStreak, currentWeeklyStreak }
}

// Get Weekly Stats
export async function getUserWeeklyStats() {
  let data = await userActivityContext.getData()

  let practices = data?.[DATA_KEY_PRACTICES] ?? {}

  let today = new Date()
  let startOfWeek = getMonday(today) // Get last Monday
  let dailyStats = []
  const todayKey = today.toISOString().split('T')[0]
  for (let i = 0; i < 7; i++) {
    let day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    let dayKey = day.toISOString().split('T')[0]

    let dayActivity = practices[dayKey] ?? null
    let isActive = dayKey === todayKey
    let type = (dayActivity !== null ? 'tracked' : (isActive ? 'active' : 'none'))
    dailyStats.push({ key: i, label: DAYS[i], isActive, inStreak: dayActivity !== null, type })
  }

  let { streakMessage } = getStreaksAndMessage(practices);

  return {
    dailyActiveStats: dailyStats,
    streakMessage
  }
}

export async function getUserMonthlyStats(year = new Date().getFullYear(), month = new Date().getMonth(), day = 1) {
  let data = await userActivityContext.getData()
  let practices = data?.[DATA_KEY_PRACTICES] ?? {}
  console.log('user practices from local storage', practices)
  // Get the first day of the specified month and the number of days in that month
  let firstDayOfMonth = new Date(year, month, 1)
  let today = new Date()

  let startOfMonth = getMonday(firstDayOfMonth)
  let endOfMonth = new Date(year, month + 1, 0)
  while (endOfMonth.getDay() !== 0) {
    endOfMonth.setDate(endOfMonth.getDate() + 1)
  }

  let daysInMonth = Math.ceil((endOfMonth - startOfMonth) / (1000 * 60 * 60 * 24)) + 1;

  let dailyStats = []
  let practiceDuration = 0
  let daysPracticed = 0
  let weeklyStats = {}

  for (let i = 0; i < daysInMonth; i++) {
    let day = new Date(startOfMonth)
    day.setDate(startOfMonth.getDate() + i)
    let dayKey = day.toISOString().split('T')[0]

    // Check if the user has activity for the day, default to 0 if undefined
    let dayActivity = practices[dayKey] ?? null
    let weekKey = getWeekNumber(day)

    if (!weeklyStats[weekKey]) {
      weeklyStats[weekKey] = { key: weekKey, inStreak: false };
    }

    if (dayActivity) {
      practiceDuration += dayActivity.reduce((sum, entry) => sum + entry.duration_seconds, 0)
      daysPracticed++;
    }
    let isActive = dayKey === today.toISOString().split('T')[0]
    let type = (dayActivity !== null ? 'tracked' : (isActive ? 'active' : 'none'))

    let isInStreak = dayActivity !== null;
    if (isInStreak) {
      weeklyStats[weekKey].inStreak = true;
    }

    dailyStats.push({
      key: i,
      label: dayKey,
      isActive,
      inStreak: dayActivity !== null,
      type,
    })
  }

  let filteredPractices = Object.keys(practices)
    .filter((date) => new Date(date) <= endOfMonth)
    .reduce((obj, key) => {
      obj[key] = practices[key]
      return obj
    }, {})

  let { currentDailyStreak, currentWeeklyStreak } = calculateStreaks(filteredPractices);

  return {
    dailyActiveStats: dailyStats,
    weeklyActiveStats: Object.values(weeklyStats),
    practiceDuration,
    currentDailyStreak,
    currentWeeklyStreak,
    daysPracticed,
  }
}

export async function getUserPractices() {
  let data = await userActivityContext.getData()
  return data?.[DATA_KEY_PRACTICES] ?? []
}

export async function recordUserPractice(practiceDetails) {
  practiceDetails.auto = 0
  if (practiceDetails.content_id) {
    const content = await fetchByRailContentIds([practiceDetails.content_id])
    practiceDetails.auto = 1
    practiceDetails.title = content[0].title
    practiceDetails.thumbnail_url = content[0].thumbnail
  }

  const today = new Date().toISOString().split('T')[0];

  const response = await logUserPractice(practiceDetails);
  if (!response ) {
    console.error('Failed to log user practice');
    return;
  }
console.log('recordUserPractice response', response)
  await userActivityContext.update(
    async function(localContext) {
      let userData = localContext.data ?? { [DATA_KEY_PRACTICES]: [] }
      if (!userData[DATA_KEY_PRACTICES]) {
        userData[DATA_KEY_PRACTICES] = {};
      }
      if (!userData[DATA_KEY_PRACTICES][today]) {
        userData[DATA_KEY_PRACTICES][today] = [];
      }
      userData[DATA_KEY_PRACTICES][today].push({duration_seconds: practiceDetails.duration_seconds});
      userData[DATA_KEY_LAST_UPDATED_TIME] = Math.round(new Date().getTime() / 1000)
      localContext.data = userData
    })
}

function getStreaksAndMessage(practices)
{
  let { currentDailyStreak, currentWeeklyStreak } = calculateStreaks(practices)

  let streakMessage = currentWeeklyStreak > 1
    ? `That's ${currentWeeklyStreak} weeks in a row! Keep going!`
    : `Nice! You have a ${currentDailyStreak} day streak! Way to keep it going!`
  return {
    currentDailyStreak,
    currentWeeklyStreak,
    streakMessage,
  }
}





