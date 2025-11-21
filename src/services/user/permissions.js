/**
 * @module Permissions
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
let userPermissionsPromise = null
let lastUpdatedKey = `userPermissions_lastUpdated`

/**
 * Fetches the user permissions data.
 *
 * @returns {Promise<UserPermissions>} - The user permissions data.
 */
export async function fetchUserPermissions() {
  if (!userPermissionsPromise || await wasLastUpdateOlderThanXSeconds(10, lastUpdatedKey)) {
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
