/**
 * @module PermissionsV2Adapter
 *
 * Permissions adapter for the new (v2) permissions system.
 * This is a placeholder implementation to be completed when v2 is ready.
 *
 * Key differences from v1:
 * - New permission structure (to be defined)
 */

import {
  PermissionsAdapter,
  UserPermissions,
  ContentItem,
  PermissionFilterOptions,
} from './PermissionsAdapter'
import {
  fetchUserPermissions as fetchUserPermissionsV2,
} from '../user/permissions.js'
import {arrayToRawRepresentation} from '../../filterBuilder.js'
import {plusMembershipPermissions} from "../../contentTypeConfig";

/**
 * V2 Permissions Adapter for the new permissions system.
 *
 * Expected changes:
 * - Different permission data structure
 * - Potentially different GROQ filter logic
 */
export class PermissionsV2Adapter extends PermissionsAdapter {
  /**
   * Fetch user permissions data from API.
   *
   * @returns The user's permissions data
   */
  async fetchUserPermissions(): Promise<UserPermissions> {
    return await fetchUserPermissionsV2()
  }

  /**
   * Check if user needs access to specific content.
   *
   * @param content - The content item
   * @param userPermissions - The user's permissions
   * @returns True if user needs access, false if they have it
   */
  doesUserNeedAccess(content: ContentItem, userPermissions: UserPermissions): boolean {
    // Admins always have access
    if (this.isAdmin(userPermissions)) {
      return false
    }

    // Get content's required permissions
    const oldPermissions = content?.permission_id ?? []
    const newPermissions = content?.permission_v2 ?? []
    const contentPermissions = new Set([...oldPermissions, ...newPermissions])

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
   * TODO: Implement v2 filter generation
   *
   * V2 Logic:
   * - When showMembershipRestrictedContent is true:
   *   * Show content restricted by Plus Membership
   *   * This supports the membership upgrade modal
   * - When showOnlyOwnedContent is true:
   *   * Shows only purchased/owned content
   *
   * @param userPermissions - The user's permissions
   * @param options - Options for filter generation
   * @returns GROQ filter string or null
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

    // If showOnlyOwnedContent, show only purchased/owned content
    if (showOnlyOwnedContent) {
      return this.buildOwnedContentFilter(userPermissions)
    }

    let userPermissionIds = this.getUserPermissionIds(userPermissions)
    const isDereferencedContext = prefix === '@->'

    // If showing membership restricted content, add Plus Membership permission
    if (showMembershipRestrictedContent) {
      userPermissionIds = [...userPermissionIds, plusMembershipPermissions]
    }

    const filter = this.buildStandardPermissionFilter(
      userPermissionIds,
      prefix,
      isDereferencedContext
    )

    return filter
  }

  /**
   * Build filter for owned content only (a-la-carte purchases).
   *
   * In V2, owned content is identified by permission IDs >= 100000000.
   * These permissions represent direct purchases of individual content items.
   *
   * Logic:
   * 1. Extract user's permission IDs
   * 2. Filter for IDs >= 100000000 (owned content permissions)
   * 3. Convert permission IDs to content IDs: content_id = permission_id - 100000000
   * 4. Filter content to show only items matching these content IDs
   *
   * @param userPermissions - The user's permissions
   * @returns GROQ filter string for owned content
   */
  private buildOwnedContentFilter(userPermissions: UserPermissions): string {
    const minContentPermissionId = 100000000
    const userPermissionIds = this.getUserPermissionIds(userPermissions)

    // Convert permission IDs to content IDs
    // Permission ID format: 100000000 + railcontent_id
    const ownedContentIds = userPermissionIds
      .map((permissionId) => parseInt(permissionId) - minContentPermissionId)
      .filter((contentId) => contentId > 0)

    if (ownedContentIds.length === 0) {
      // User has no owned content permissions
      // Return filter that matches nothing
      return `railcontent_id == null`
    }

    // Content must be in owned content IDs
    const ownerContentFilter = `railcontent_id in ${arrayToRawRepresentation(ownedContentIds)}`
    return ` ${ownerContentFilter} `
  }

  /**
   * Build standard permission filter (content with no permissions OR user has matching permissions).
   *
   * @param userPermissionIds - User's permission IDs
   * @param prefix - GROQ prefix for nested queries
   * @param isDereferencedContext - Whether we're in a dereferenced context
   * @returns GROQ filter string for standard permissions
   */
  private buildStandardPermissionFilter(
    userPermissionIds: string[],
    prefix: string,
    isDereferencedContext: boolean
  ): string {
    const clauses: string[] = []

    // Content with no permissions is accessible to all
    // A content has "no permissions" if BOTH permission and permission_v2 are empty/undefined
    clauses.push(`((!defined(${prefix}permission) || count(${prefix}permission) == 0) && (!defined(${prefix}permission_v2) || count(${prefix}permission_v2) == 0))`)

    // User has matching permissions
    if (userPermissionIds.length > 0) {
      clauses.push(this.buildPermissionCheck(userPermissionIds, prefix, isDereferencedContext))
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
      return `((count((${prefix}permission[]._ref)[@ in *[_type == 'permission' && railcontent_id in ${arrayToRawRepresentation(permissions)}]._id]) > 0)
      || count(array::intersects(${prefix}permission_v2, ${arrayToRawRepresentation(permissions)})) > 0)`
    }
    // In standard context, use references() function
    return `(references(*[_type == 'permission' && railcontent_id in ${arrayToRawRepresentation(permissions)}]._id) ||
     count(array::intersects(permission_v2, ${arrayToRawRepresentation(permissions)})) > 0)`
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
