/**
 * @module UserProfile
 */
import { globalConfig } from '../config.js'
import { fetchHandler } from '../railcontent.js'
import { calculateLongestStreaks } from '../userActivity.js'
import './types.js'

const baseUrl = `/api/user-management-system`

/**
 * @param {number|null} userId - The user ID to reset permissions for.
 * @returns {Promise<OtherStatsDTO>}
 */
export async function otherStats(userId = globalConfig.sessionConfig.userId) {
  const [otherStats, longestStreaks] = await Promise.all([
    fetchHandler(`${baseUrl}/v1/users/${userId}/statistics`, 'get'),
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

/**
 * Delete profile picture for the authenticated user
 *
 * @returns {Promise<void>}
 */
export async function deleteProfilePicture() {
  const url = `${baseUrl}/v1/users/profile_picture`
  const response = await fetchHandler(url, 'DELETE')

  if (!response.ok) {
    const problemDetails = await response.json()
    console.log('Error deleting profile picture:', problemDetails.detail)
    throw new Error(`Delete failed: ${problemDetails.detail}`)
  }
}
