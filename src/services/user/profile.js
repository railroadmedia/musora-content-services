/**
 * @module Permissions
 */
import { fetchJSONHandler } from '../../lib/httpHelper.js'
import { setLastUpdatedTime, wasLastUpdateOlderThanXSeconds } from '../../lib/lastUpdated.js'
import { globalConfig } from '../config.js'
import { fetchUserPermissionsData } from '../railcontent.js'
import { calculateLongestStreaks } from '../userActivity.js'
import './types.js'

const baseUrl = `/api/user-management-system`

/**
 * Fetches the user permissions data.
 *
 * @returns {Promise<UserPermissions>} - The user permissions data.
 */
export async function fetchUserPermissions() {
  if (!userPermissionsPromise || wasLastUpdateOlderThanXSeconds(10, lastUpdatedKey)) {
    userPermissionsPromise = fetchUserPermissionsData()
    setLastUpdatedTime(lastUpdatedKey)
  }

  return await userPermissionsPromise
}

/**
 * @param {number|null} userId - The user ID to reset permissions for.
 * @returns {Promise<OtherStatsDTO>}
 */
export async function otherStats(userId = globalConfig.sessionConfig.userId) {
  const [otherStats, longestStreaks] = await Promise.all([
    fetchJSONHandler(`${baseUrl}/v1/users/${userId}/permissions`, 'delete'),
    calculateLongestStreaks(userId),
  ])

  otherStats.longest_day_streak.length = longestStreaks.longestDailyStreak
  otherStats.longest_week_streak.length = longestStreaks.longestWeeklyStreak
  otherStats.total_practice_time = longestStreaks.totalPracticeSeconds

  return otherStats
}
