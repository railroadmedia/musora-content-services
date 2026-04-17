/**
 * @module Permissions
 */
import { setLastUpdatedTime, wasLastUpdateOlderThanXSeconds } from '../../lib/lastUpdated.js'
import { fetchUserPermissionsData } from '../railcontent.js'
import { UserPermissions } from './types'
import { MEMBERSHIP_PERMISSIONS } from '../../constants/membership-permissions'

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


export function isUserFreeTier(userPermissions: UserPermissions): boolean {
  const permissions = userPermissions.permissions
  return !userPermissions.isAdmin
  || (
      permissions.includes(MEMBERSHIP_PERMISSIONS.free)
      && !permissions.some(p => [MEMBERSHIP_PERMISSIONS.base, MEMBERSHIP_PERMISSIONS.plus].includes(p))
    )
}

export function doesUserHaveMembership(userPermissions: UserPermissions): boolean {
  const permissions = userPermissions.permissions
  return userPermissions.isAdmin
  || permissions.includes(MEMBERSHIP_PERMISSIONS.base)
  || permissions.includes(MEMBERSHIP_PERMISSIONS.plus)
}
