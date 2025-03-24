/**
 * @module User-Permissions
 */
import { setLastUpdatedTime, wasLastUpdateOlderThanXSeconds } from '../../lib/lastUpdated.js'
import { fetchUserPermissionsData } from '../railcontent.js'
import './types.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

const DAY_IN_SECONDS = 86_400

let userPermissionsPromise = null
let lastUpdatedKey = `userPermissions_lastUpdated`

/**
 * Fetches the user permissions data.
 *
 * @param {boolean} [resetCache=false]
 *
 * @returns {Promise<UserPermissions>} - The user permissions data.
 */
export async function fetchUserPermissions(resetCache = false) {
  if (resetCache) {
    userPermissionsPromise = null
  }

  if (!userPermissionsPromise || wasLastUpdateOlderThanXSeconds(DAY_IN_SECONDS, lastUpdatedKey)) {
    userPermissionsPromise = fetchUserPermissionsData()
    setLastUpdatedTime(lastUpdatedKey)
  }

  return await userPermissionsPromise
}

/**
 * Resets the user permissions data.
 *
 * @returns {Promise<void>}
 */
export async function reset() {
  userPermissionsPromise = null
}
