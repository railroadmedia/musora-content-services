/**
 * @module PermissionsV1Adapter
 *
 * Permissions adapter for the current (v1) permissions system.
 * Implements the existing permission logic using permission IDs.
 */

import {
  PermissionsAdapter,
  UserPermissions,
  ContentItem,
  PermissionFilterOptions,
} from './PermissionsAdapter'
import {
  fetchUserPermissions as fetchUserPermissionsV1,
  reset as resetV1,
} from '../user/permissions.js'
import { plusMembershipPermissions } from '../../contentTypeConfig.js'
import { arrayToRawRepresentation } from '../../filterBuilder.js'

/**
 * V1 Permissions Adapter implementing the current permissions system.
 *
 * Logic:
 * - Content access based on permission IDs
 * - Basic members get access to songs content (permission 92)
 * - Admins bypass all checks
 * - Content with no permissions is accessible to all
 * - User needs at least ONE matching permission to access content
 */
export class PermissionsV1Adapter extends PermissionsAdapter {
  /**
   * Membership permission IDs that represent membership tiers.
   * These are the standard membership-level permissions in the system.
   *
   * Common values:
   * - 78: Basic membership (estimated)
   * - 91: Edge membership (estimated)
   * - 92: Plus membership (confirmed)
   */
  static readonly MEMBERSHIP_PERMISSION_IDS = [78, 91, 92]

  /**
   * Fetch user permissions data from v1 API.
   *
   * @returns The user's permissions data
   */
  async fetchUserPermissions(): Promise<UserPermissions> {
    return await fetchUserPermissionsV1()
  }

  /**
   * Check if user needs access to specific content.
   *
   * V1 Logic:
   * - Admins always have access (return false)
   * - Content with no permissions is accessible (return false)
   * - User must have at least ONE matching permission (return false if found)
   * - Otherwise user needs access (return true)
   *
   * @param content - The content item with permission_id array
   * @param userPermissions - The user's permissions
   * @returns True if user needs access, false if they have it
   */
  doesUserNeedAccess(content: ContentItem, userPermissions: UserPermissions): boolean {
    // Admins always have access
    if (this.isAdmin(userPermissions)) {
      return false
    }

    // Get content's required permissions
    const contentPermissions = new Set(content?.permission_id ?? [])

    // Content with no permissions is accessible to all
    if (contentPermissions.size === 0) {
      return false
    }

    // Convert user permissions to Set for fast lookup
    const userPermissionSet = new Set(userPermissions?.permissions ?? [])

    // Check if user has ANY of the required permissions
    for (const permission of contentPermissions) {
      if (userPermissionSet.has(permission)) {
        return false // User has access
      }
    }

    // User doesn't have any required permissions
    return true
  }

  /**
   * Generate GROQ filter string for permissions.
   *
   * V1 Logic:
   * - Admins bypass filter (return null)
   * - Basic members get plus membership permissions for songs
   * - Filter: content has no permission OR references user's permissions
   * - If showMembershipRestrictedContent: also show content with permission 92 (Plus membership)
   *
   * @param userPermissions - The user's permissions
   * @param options - Options for filter generation
   * @returns GROQ filter string or null for admin
   */
  generatePermissionsFilter(
    userPermissions: UserPermissions,
    options: PermissionFilterOptions = {}
  ): string | null {
    const {
      allowsPullSongsContent = true,
      prefix = '',
      showMembershipRestrictedContent = false,
    } = options

    // Admins bypass permission filter
    if (this.isAdmin(userPermissions)) {
      return null
    }

    // Get user's permission IDs
    let requiredPermissions = this.getUserPermissionIds(userPermissions)

    // Basic members get access to songs content (permission 92)
    if (userPermissions?.isABasicMember && allowsPullSongsContent) {
      requiredPermissions = [...requiredPermissions, String(plusMembershipPermissions)]
    }

    // Generate GROQ filter
    // Content is accessible if:
    // 1. It has no permissions defined, OR
    // 2. It references a permission the user has

    // Build the base filter
    let permissionFilter = `!defined(${prefix}permission)`

    // When we're in a dereferenced context (@->), we need to check the permission array directly
    // rather than using the references() function which works on the reference itself
    const isDerefencedContext = prefix === '@->'

    // If user has permissions, add them to the filter
    if (requiredPermissions.length > 0) {
      if (isDerefencedContext) {
        // In dereferenced context, check if any permission reference is in the allowed set
        // We use count() with array filtering to check for intersection
        permissionFilter = `(${permissionFilter} || count((${prefix}permission[]._ref)[@ in *[_type == 'permission' && railcontent_id in ${arrayToRawRepresentation(requiredPermissions)}]._id]) > 0)`
      } else {
        // In normal context, use references() function
        permissionFilter = `(${permissionFilter} || references(*[_type == 'permission' && railcontent_id in ${arrayToRawRepresentation(requiredPermissions)}]._id))`
      }
    }

    // If showing membership-restricted content, also include content with permissions 91 (Basic) and 92 (Plus)
    // This shows membership content to encourage upgrades
    if (showMembershipRestrictedContent) {
      if (isDerefencedContext) {
        permissionFilter = `(${permissionFilter} || count((${prefix}permission[]._ref)[@ in *[_type == 'permission' && railcontent_id in [91, 92]]._id]) > 0)`
      } else {
        permissionFilter = `(${permissionFilter} || references(*[_type == 'permission' && railcontent_id in [91, 92]]._id))`
      }
    }

    return permissionFilter
  }

  /**
   * Get user's permission IDs.
   *
   * @param userPermissions - The user's permissions
   * @returns Array of permission IDs
   */
  getUserPermissionIds(userPermissions: UserPermissions): string[] {
    return userPermissions?.permissions ?? []
  }

  /**
   * Reset cached permission data.
   *
   * @returns Promise that resolves when reset is complete
   */
  async reset(): Promise<void> {
    await resetV1()
  }
}
