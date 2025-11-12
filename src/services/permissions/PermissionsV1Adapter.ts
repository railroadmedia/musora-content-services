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
} from '../user/permissions.js'
import { plusMembershipPermissions, membershipPermissions } from '../../contentTypeConfig.js'
import { arrayToRawRepresentation } from '../../filterBuilder.js'

/**
 * V1 Permissions Adapter implementing the current permissions system.
 *
 * Logic:
 * - Content access based on permission IDs
 * - Admins bypass all checks
 * - Content with no permissions is accessible to all
 * - User needs at least ONE matching permission to access content
 * - If showMembershipRestrictedContent: also show content that requires membership
 */
export class PermissionsV1Adapter extends PermissionsAdapter {
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
   * - Filter: content has no permission OR references user's permissions
   * - If showMembershipRestrictedContent: also show content that requires membership
   * - If showOnlyOwnedContent: exclude membership content (permissions 91, 92), show only purchased/owned content
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
      prefix = '',
      showMembershipRestrictedContent = false,
      showOnlyOwnedContent = false,
    } = options

    // Admins bypass permission filter
    if (this.isAdmin(userPermissions)) {
      return null
    }

    const userPermissionIds = this.getUserPermissionIds(userPermissions)
    const isDereferencedContext = prefix === '@->'

    if (showOnlyOwnedContent) {
      return this.buildOwnedContentFilter(userPermissionIds, prefix, isDereferencedContext)
    }

    return this.buildStandardPermissionFilter(
      userPermissionIds,
      prefix,
      isDereferencedContext,
      showMembershipRestrictedContent
    )
  }

  /**
   * Build filter for owned content only (excluding membership content).
   *
   * @param userPermissionIds - User's permission IDs
   * @param prefix - GROQ prefix for nested queries
   * @param isDereferencedContext - Whether we're in a dereferenced context
   * @returns GROQ filter string for owned content
   */
  private buildOwnedContentFilter(
    userPermissionIds: string[],
    prefix: string,
    isDereferencedContext: boolean
  ): string {
    // Filter out membership permissions to get only owned permissions
    const ownedPermissions = userPermissionIds.filter(
      permId => !membershipPermissions.includes(parseInt(permId))
    )

    if (ownedPermissions.length === 0) {
      // User has no owned permissions (only membership or none at all)
      // Return filter that matches nothing - user can't see any owned content
      return `${prefix}_id == null`
    }

    // Content must have at least one owned permission AND no membership permissions
    if (isDereferencedContext) {
      // In dereferenced context, check arrays directly
      const hasOwnedPermission = `count((${prefix}permission[]._ref)[@ in *[_type == 'permission' && railcontent_id in ${arrayToRawRepresentation(ownedPermissions)}]._id]) > 0`
      const hasMembershipPermission = `count((${prefix}permission[]._ref)[@ in *[_type == 'permission' && railcontent_id in ${arrayToRawRepresentation(membershipPermissions)}]._id]) > 0`
      return `(${hasOwnedPermission} && !${hasMembershipPermission})`
    }

    // Non-dereferenced: use references() function
    const hasOwnedPermissions = `references(*[_type == 'permission' && railcontent_id in ${arrayToRawRepresentation(ownedPermissions)}]._id)`
    const hasMembershipPermissions = `references(*[_type == 'permission' && railcontent_id in ${arrayToRawRepresentation(membershipPermissions)}]._id)`
    return `(${hasOwnedPermissions} && !${hasMembershipPermissions})`
  }

  /**
   * Build standard permission filter (content with no permissions OR user has matching permissions).
   *
   * @param userPermissionIds - User's permission IDs
   * @param prefix - GROQ prefix for nested queries
   * @param isDereferencedContext - Whether we're in a dereferenced context
   * @param showMembershipRestrictedContent - Whether to show membership-restricted content
   * @returns GROQ filter string for standard permissions
   */
  private buildStandardPermissionFilter(
    userPermissionIds: string[],
    prefix: string,
    isDereferencedContext: boolean,
    showMembershipRestrictedContent: boolean
  ): string {
    const clauses: string[] = []

    // Content with no permissions is accessible to all
    clauses.push(`!defined(${prefix}permission)`)

    // User has matching permissions
    if (userPermissionIds.length > 0) {
      clauses.push(this.buildPermissionCheck(userPermissionIds, prefix, isDereferencedContext))
    }

    // Include membership-restricted content
    if (showMembershipRestrictedContent) {
      clauses.push(
        this.buildPermissionCheck(
          membershipPermissions.map(String),
          prefix,
          isDereferencedContext
        )
      )
    }

    return `(${clauses.join(' || ')})`
  }

  /**
   * Build GROQ permission check for given permissions.
   * Handles both dereferenced and standard contexts.
   *
   * @param permissions - Permission IDs to check
   * @param prefix - GROQ prefix for nested queries
   * @param isDereferencedContext - Whether we're in a dereferenced context
   * @returns GROQ filter string for permission check
   */
  private buildPermissionCheck(
    permissions: string[],
    prefix: string,
    isDereferencedContext: boolean
  ): string {
    if (isDereferencedContext) {
      // In dereferenced context, check the permission array directly
      return `count((${prefix}permission[]._ref)[@ in *[_type == 'permission' && railcontent_id in ${arrayToRawRepresentation(permissions)}]._id]) > 0`
    }
    // In standard context, use references() function
    return `references(*[_type == 'permission' && railcontent_id in ${arrayToRawRepresentation(permissions)}]._id)`
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
}
