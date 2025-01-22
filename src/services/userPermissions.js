import { fetchUserPermissionsData } from './railcontent.js'
import { setLastUpdatedTime, wasLastUpdateOlderThanXSeconds } from './lastUpdated.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []
let userPermissionsPromise = null
let lastUpdatedKey = `userPermissions_lastUpdated`

export async function fetchUserPermissions() {
  if (!userPermissionsPromise || wasLastUpdateOlderThanXSeconds(10, lastUpdatedKey)) {
    userPermissionsPromise = fetchUserPermissionsData()
    setLastUpdatedTime(lastUpdatedKey)
  }

  return await userPermissionsPromise
}

export async function reset() {
  userPermissionsPromise = null
}
