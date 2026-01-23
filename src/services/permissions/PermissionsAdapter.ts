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
  /** Whether the user is a moderator */
  isModerator: boolean
  /** Whether the user has basic membership */
  isABasicMember: boolean
  /** User's access level (v2 - for future use) */
  access_level?: string
}

/**
 * Options for generating permission filters
 */
export interface PermissionFilterOptions {
  /** GROQ prefix for nested queries (e.g., '^.' for parent, '@->' for children) */
  prefix?: string
  /**
   * If true, show content that requires paid membership even if user doesn't have it.
   * Used for upgrade prompts. V1: includes permissions [91, 92]. V2: shows content with membership_tier='plus'|'basic'|'free'
   */
  showMembershipRestrictedContent?: boolean
  /**
   * If true, show only content owned by user through purchases/entitlements, excluding membership content.
   * V1: excludes permissions [91, 92]. V2: excludes content with membership_tier='plus'|'basic'
   */
  showOnlyOwnedContent?: boolean
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
   * Check if user is a moderator.
   *
   * @param userPermissions - The user's permissions
   * @returns True if user is moderator
   */
  isModerator(userPermissions: UserPermissions): boolean {
    return userPermissions?.isModerator ?? false
  }
}
