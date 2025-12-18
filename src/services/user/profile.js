/**
 * @module UserProfile
 */
import { globalConfig } from '../config.js'
import { GET, DELETE } from '../../infrastructure/http/HttpClient.js'
import { calculateLongestStreaks } from '../userActivity.js'
import './types.js'

const baseUrl = `/api/user-management-system`

/**
 * @param {number|null} userId - The user ID to reset permissions for.
 * @returns {Promise<OtherStatsDTO>}
 */
export async function otherStats(userId = globalConfig.sessionConfig.userId) {
  const [stats, longestStreaks] = await Promise.all([
    GET(`${baseUrl}/v1/users/${userId}/statistics`),
    calculateLongestStreaks(userId),
  ])

  return {
    ...stats,
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

/**
 * Delete profile picture for the authenticated user
 *
 * @returns {Promise<void>}
 */
export async function deleteProfilePicture() {
  const url = `${baseUrl}/v1/users/profile_picture`
  await DELETE(url)
}
