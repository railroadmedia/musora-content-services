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
import {arrayToRawRepresentation, arrayToStringRepresentation} from '../../filterBuilder.js'

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
      return `(!defined(membership_tier) || membership_tier == "plus")`
    }

    // If showOnlyOwnedContent, show only purchased/owned content
    if (showOnlyOwnedContent) {
      return this.buildOwnedContentFilter(userPermissions)
    }

    // TODO: Implement v2 permission filter logic
    return null // Placeholder return until implemented
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
   * 5. Exclude membership-tier content (plus, basic, free) ???
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

    // Content must be in owned content IDs AND not have membership tier
    const ownerContentFilter = `railcontent_id in ${arrayToRawRepresentation(ownedContentIds)}`
  //const noMembershipTier = `(!defined(membership_tier) || (membership_tier != "plus" && membership_tier != "basic" && membership_tier != "free"))`

    console.log('rox::: V2Adapter buildOwnedContentFilter - final filter', ownerContentFilter)
    return ` ${ownerContentFilter} `
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
  }
}
