/**
 * @module UserManagement
 */
import { fetchHandler } from '../railcontent.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

const baseUrl = `/api/user-management-system`

/**
 * Block the provided user
 * @param userId
 * @returns {Promise<any|string|null>}
 */
export async function blockUser(userId) {
  const url = `${baseUrl}/v1/block/${userId}`
  return fetchHandler(url, 'post')
}

/**
 * Unblock the provided user. Returns a 422 if the user wasn't blocked
 * @param userId
 * @returns {Promise<any|string|null>}
 */
export async function unblockUser(userId) {
  const url = `${baseUrl}/v1/unblock/${userId}`
  return fetchHandler(url, 'post')
}
