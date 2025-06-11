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
  const isCacheStale = await wasLastUpdateOlderThanXSeconds(10, lastUpdatedKey)
  if (!userPermissionsPromise || isCacheStale) {
    userPermissionsPromise = fetchUserPermissionsData()
    await setLastUpdatedTime(lastUpdatedKey)
  }

  return await userPermissionsPromise
}

export async function reset() {
  userPermissionsPromise = null
}

export async function updatePermissionsData(permissionsData) {
  userPermissionsPromise = permissionsData
  await setLastUpdatedTime(lastUpdatedKey)
}

export async function clearPermissionsData() {
  userPermissionsPromise = null
  await clearLastUpdatedTime(lastUpdatedKey)
}
