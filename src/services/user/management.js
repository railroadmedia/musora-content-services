/**
 * @module User-Management
 */
import { fetchHandler } from '../railcontent.js'



/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

const baseUrl = `/api/user-management-system/v1`

export async function blockUser(userId) {
  const url = `${baseUrl}/block/${userId}`
  return postHandler(url)
}

export async function unblockUser(userId) {
  const url = `${baseUrl}/unblock/${userId}`
  return postHandler(url)
}

async function postHandler(url, body = null) {
  return fetchHandler(url,'post',null, body)
}
