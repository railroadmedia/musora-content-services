import { fetchUserPermissionsData } from './railcontent.js'
import {
  clearLastUpdatedTime,
  setLastUpdatedTime,
  wasLastUpdateOlderThanXSeconds,
} from './lastUpdated.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []
let userPermissionsPromise = null
let lastUpdatedKey = `userPermissions_lastUpdated`

export async function fetchUserPermissions() {
  if (!userPermissionsPromise || (await wasLastUpdateOlderThanXSeconds(10, lastUpdatedKey))) {
    userPermissionsPromise = fetchUserPermissionsData()
    setLastUpdatedTime(lastUpdatedKey)
  }

  return await userPermissionsPromise
}

export async function reset() {
  userPermissionsPromise = null
}

export function updatePermissionsData(permissionsData) {
  userPermissionsPromise = permissionsData
  setLastUpdatedTime(lastUpdatedKey)
}

export function clearPermissionsData() {
  userPermissionsPromise = null
  clearLastUpdatedTime(lastUpdatedKey)
}
