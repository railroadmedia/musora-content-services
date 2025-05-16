/**
 * @module Profile
 */

import { fetchJSONHandler } from '../../lib/httpHelper'
import { globalConfig } from '../config.js'
import { calculateLongestStreaks } from '../userActivity.js'
import './types.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

/**
 * Fetches the user permissions data.
 *
 * @param {int} userId - The user ID.
 *
 * @returns {Promise<OtherStats>} - The user permissions data.
 */
export async function otherStats(userId) {
  const [otherStats, longestStreaks] = await Promise.all([
    fetchJSONHandler(
      `/user-management-system/v1/${userId}/statistics`,
      globalConfig.sessionConfig.token,
      globalConfig.baseUrl,
      'get'
    ),
    calculateLongestStreaks(userId),
  ])

  return {
    longest_day_streak: {
      type: 'day',
      streak: longestStreaks.longestDailyStreak,
    },
    longest_week_streak: {
      type: 'week',
      streak: longestStreaks.longestWeeklyStreak,
    },
    total_practice_time: longestStreaks.totalPracticeTime,
    comment_likes: otherStats?.comment_likes,
    forum_post_likes: otherStats?.forum_post_likes,
    experience_points: otherStats?.experience_points,
  }
}
