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

/**
 * V2 Permissions Adapter for the new permissions system.
 *
 * TODO: Implement when v2 permissions are finalized.
 *
 * Expected changes:
 * - Different permission data structure
 * - Potentially different GROQ filter logic
 * - New API endpoints for fetching permissions ?
 */
export class PermissionsV2Adapter extends PermissionsAdapter {
  /**
   * Fetch user permissions data from v2 API.
   *
   * TODO: Implement v2 API call
   *
   * @returns The user's permissions data
   */
  async fetchUserPermissions(): Promise<UserPermissions> {
    return await fetchUserPermissionsV2()
  }

  /**
   * Check if user needs access to specific content.
   *
   * TODO: Implement v2 access checking logic
   *
   * V2 Logic (to be defined):
   * - TBD based on v2 requirements
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
    // TODO: Implement v2 access checking
    // throw new Error('PermissionsV2Adapter.doesUserNeedAccess() not yet implemented')
  }

  /**
   * Generate GROQ filter string for permissions.
   *
   * TODO: Implement v2 filter generation
   *
   * V2 Logic (to be defined):
   * - TBD based on v2 requirements
   * - May use different permission structure
   * - When showMembershipRestrictedContent is true:
   *   * Show content where membership_tier == 'Plus'|'Basic'|'Free'
   *   * This supports the membership upgrade modal
   * - When showOnlyOwnedContent is true:
   *   * Exclude content where membership_tier == 'Plus'|'Basic'
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
    // TODO: Implement v2 GROQ filter generation
    // When options.showMembershipRestrictedContent === true:
    // Filter should include content with membership_tier == 'plus' || membership_tier == "basic" || membership_tier == "free"
    const {
      prefix = '',
      showMembershipRestrictedContent = false,
      showOnlyOwnedContent = false,
    } = options

    // Admins bypass permission filter
    if (this.isAdmin(userPermissions)) {
      return null
    }

    if (showMembershipRestrictedContent) {
      return `(membership_tier == "plus" || membership_tier == "basic" || membership_tier == "free")`
    }

    // If showOnlyOwnedContent, exclude membership content
    if (showOnlyOwnedContent) {
      //TODO: add logic for owned content
      return `(!defined(membership_tier) || (membership_tier != "plus" && membership_tier != "basic" && membership_tier != "free"))`
    }

    // TODO: Implement v2 permission filter logic
    return null // Placeholder return until implemented
  }

  /**
   * Get user's permission IDs.
   *
   * TODO: Implement v2 permission ID retrieval
   * Note: V2 might not use permission IDs in the same way
   *
   * @param userPermissions - The user's permissions
   * @returns Array of permission IDs
   */
  getUserPermissionIds(userPermissions: UserPermissions): string[] {
    return userPermissions?.permissions ?? []
    // TODO: Implement v2 permission ID retrieval
    // throw new Error('PermissionsV2Adapter.getUserPermissionIds() not yet implemented')
  }
}
