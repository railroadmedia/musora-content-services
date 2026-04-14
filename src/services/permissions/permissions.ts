/**
 * @module Permissions
 */
import { setLastUpdatedTime, wasLastUpdateOlderThanXSeconds } from '../../lib/lastUpdated.js'
import { fetchUserPermissionsData } from '../railcontent.js'
import { UserMembershipTier, UserPermissions } from './types'
import { getPermissionsAdapter } from './PermissionsAdapterFactory'

let userPermissionsPromise = null
let lastUpdatedKey = `userPermissions_lastUpdated`

/**
 * Fetches the user permissions data.
 *
 * @returns {Promise<UserPermissions>} - The user permissions data.
 */
export async function fetchUserPermissions(): Promise<UserPermissions> {
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
export async function reset(): Promise<void> {
  userPermissionsPromise = null
}

export async function getUserMembershipTier(): Promise<UserMembershipTier> {
  const adapter = getPermissionsAdapter()
  const userData = await adapter.fetchUserPermissions()
  return userData.membershipTier
}
