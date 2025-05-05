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
  let otherStats = {}
  try {
    otherStats = await fetchJSONHandler(
      `/user-management-system/v1/${userId}/statistics`,
      globalConfig.sessionConfig.token,
      globalConfig.baseUrl,
      'get'
    )
  } catch (error) {
    console.error('Error fetching other stats:', error)
  }

  const longestStreaks = await calculateLongestStreaks(userId)

  return {
    ...otherStats,
    ...longestStreaks,
  }
}
