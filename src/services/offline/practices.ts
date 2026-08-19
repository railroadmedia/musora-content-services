import { db } from '../sync'
import { Q } from '@nozbe/watermelondb'
import dayjs from 'dayjs'
import { globalConfig } from '../config'
import { calculateLongestStreaks } from '../userActivity.js'
import { getMonday } from '../dateUtils.js'

/**
 * @param offlineTimestamp - Minimum `updated_at` epoch ms to include
 * @param day
 * @param options.day - Date in YYYY-MM-DD format, defaults to today
 * @param options.page - Page number, only applied when `limit` is set (default 1)
 * @param options.limit - Max sessions to return
 * @returns {Promise<{data: {practices: object[], practiceDuration: number, total: number, currentPage: number, totalPages: number}}>}
 */
export async function getPracticeSessionsOffline(
  offlineTimestamp: number, {
    day = dayjs().format('YYYY-MM-DD'),
    page = 1,
    limit
  }: { day?: string, page?: number, limit?: number } = {}
) {

  const query = await db.practices.queryAll(
    Q.where('date', day),
    Q.sortBy('created_at', 'asc'))

  return formatPracticeSessionDataOffline(query.data, page, limit)
}

/**
 * @param offlineTimestamp - Minimum `updated_at` epoch ms to include
 * @param options.page - Page number, only applied when `limit` is set (default 1)
 * @param options.limit - Max sessions to return
 * @returns {Promise<{data: {practices: object[], practiceDuration: number, total: number, currentPage: number, totalPages: number}}>}
 */
export async function getWeeklyPracticeSessionsOffline(
  offlineTimestamp: number, {
    page = 1,
    limit
  }: { page?: number, limit?: number } = {}
) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const startOfWeek = getMonday(new Date(), timeZone)
  const weekDays = Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day').format('YYYY-MM-DD'))

  const query = await db.practices.queryAll(
    Q.where('date', Q.oneOf(weekDays)),
    Q.sortBy('created_at', 'asc'))

  return formatPracticeSessionDataOffline(query.data, page, limit)
}

function formatPracticeSessionDataOffline(practices: any[], page: number, limit?: number) {
  if (!practices.length)
    return { data: { practices: [], practiceDuration: 0, total: 0, currentPage: page, totalPages: 1 } }

  const practiceDuration = Math.round(practices.reduce(
    (total, practice) => total + (practice.duration_seconds || 0),
    0
  ))

  const pagedPractices = limit ? practices.slice((page - 1) * limit, page * limit) : practices

  return {
    data: {
      practices: pagedPractices,
      practiceDuration,
      total: practices.length,
      currentPage: page,
      totalPages: limit ? Math.ceil(practices.length / limit) : 1,
    },
  }
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
