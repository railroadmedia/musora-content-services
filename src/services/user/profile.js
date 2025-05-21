/**
 * @module UserProfile
 */
import { fetchJSONHandler } from '../../lib/httpHelper.js'
import { globalConfig } from '../config.js'
import { calculateLongestStreaks } from '../userActivity.js'
import './types.js'

const baseUrl = `/api/user-management-system`

/**
 * @param {number|null} userId - The user ID to reset permissions for.
 * @returns {Promise<OtherStatsDTO>}
 */
export async function otherStats(userId = globalConfig.sessionConfig.userId) {
  const [otherStats, longestStreaks] = await Promise.all([
    fetchJSONHandler(`${baseUrl}/v1/users/${userId}/statistics`, 'get'),
    calculateLongestStreaks(userId),
  ])

  return {
    ...otherStats,
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
