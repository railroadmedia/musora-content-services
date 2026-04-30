import { db } from '../sync'
import { Q } from '@nozbe/watermelondb'
import dayjs from 'dayjs'
import { globalConfig } from '../config'
import { calculateLongestStreaks } from '../userActivity.js'

/**
 * @param offlineTimestamp - Minimum `updated_at` epoch ms to include
 * @param day
 * @param options.day - Date in YYYY-MM-DD format, defaults to today
 * @returns {Promise<{data: {practices: object[], practiceDuration: number}}>}
 */
export async function getPracticeSessionsOffline(
  offlineTimestamp: number, {
    day = dayjs().format('YYYY-MM-DD') }: { day?: string } = {}
) {

  const query = await db.practices.queryAll(
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

export async function otherStatsOffline(userId = globalConfig.sessionConfig.userId) {
  const longestStreaks = await calculateLongestStreaks(userId)

  return {
    longest_day_streak: {
      type: 'day',
      length: longestStreaks.longestDailyStreak,
    },
    longest_week_streak: {
      type: 'week',
      length: longestStreaks.longestWeeklyStreak,
    },
    total_practice_time: longestStreaks.totalPracticeSeconds,
  }
}
