/**
 * @module PermissionsAdapter
 *
 * Abstract base class defining the contract for permissions operations.
 * This abstraction allows swapping between different permission implementations
 * (v1 and v2) without changing consumer code.
 */

/**
 * User permissions data structure
 */
export interface UserPermissions {
  /** Array of permission IDs the user has access to */
  permissions: string[]
  /** Whether the user is an admin */
  isAdmin: boolean
  /** Whether the user has basic membership */
  isABasicMember: boolean
  /** User's access level (v2) */
  access_level?: string
  /** Whether user owns packs (v1, deprecated in v2) */
  is_pack_owner?: boolean
  /** Whether user owns challenges (v1, deprecated in v2) */
  is_challenge_owner?: boolean
  /** User's permission level (admin, etc.) */
  permission_level?: string
}

/**
 * Options for generating permission filters
 */
export interface PermissionFilterOptions {
  /** Whether to allow basic members access to songs content */
  allowsPullSongsContent?: boolean
  /** GROQ prefix for nested queries (e.g., '^.' for parent, '@->' for children) */
  prefix?: string
  /**
   * If true, show content that requires paid membership even if user doesn't have it.
   * Used for upgrade prompts. V1: includes permission 92 (Plus). V2: shows content with membership_tier='Plus'
   */
  showMembershipRestrictedContent?: boolean
}

/**
 * Content item with permission requirements
 */
export interface ContentItem {
  /** Array of permission IDs required to access this content */
  permission_id?: string[]
  [key: string]: any
}

/**
 * Abstract base class for permissions adapters.
 * Subclasses must implement all methods to provide version-specific logic.
 */
export abstract class PermissionsAdapter {
  /**
   * Fetch user permissions data.
   *
   * @returns The user's permissions data
   * @abstract
   */
  abstract fetchUserPermissions(): Promise<UserPermissions>

  /**
   * Check if user needs access to specific content.
   * Returns true if the user does NOT have access and needs to upgrade/purchase.
   *
   * @param content - The content item to check
   * @param userPermissions - The user's permissions
   * @returns True if user needs access, false if they already have it
   * @abstract
   */
  abstract doesUserNeedAccess(
    content: ContentItem,
    userPermissions: UserPermissions
  ): boolean

  /**
   * Generate GROQ filter string for permissions.
   * Returns null if no filter should be applied (e.g., admin user).
   *
   * @param userPermissions - The user's permissions
   * @param options - Options for filter generation
   * @returns GROQ filter string or null
   * @abstract
   */
  abstract generatePermissionsFilter(
    userPermissions: UserPermissions,
    options?: PermissionFilterOptions
  ): string | null

  /**
   * Get user's permission IDs.
   * Useful for cases where you need raw permission IDs.
   *
   * @param userPermissions - The user's permissions
   * @returns Array of permission IDs
   * @abstract
   */
  abstract getUserPermissionIds(userPermissions: UserPermissions): string[]

  /**
   * Check if user is an admin.
   * Admins typically bypass all permission checks.
   *
   * @param userPermissions - The user's permissions
   * @returns True if user is admin
   */
  isAdmin(userPermissions: UserPermissions): boolean {
    return userPermissions?.isAdmin ?? false
  }

  /**
   * Reset any cached permission data.
   * Called when permissions need to be refreshed.
   *
   * @returns Promise that resolves when reset is complete
   */
  async reset(): Promise<void> {
    // Default implementation does nothing
    // Subclasses can override if they cache data
  }
}
