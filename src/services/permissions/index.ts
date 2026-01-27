/**
 * @module Permissions
 *
 * Permissions abstraction layer for Musora Content Services.
 *
 * This module provides a flexible abstraction that allows swapping between
 * different permission implementations (v1 and v2) without changing code.
 *
 * ## Quick Start
 *
 * ```typescript
 * import { getPermissionsAdapter } from './permissions/index.js'
 *
 * // Get the adapter (automatically selects v1 or v2 based on config)
 * const adapter = getPermissionsAdapter()
 *
 * // Fetch user permissions
 * const permissions = await adapter.fetchUserPermissions()
 *
 * // Check if user needs access to content
 * const needsAccess = adapter.doesUserNeedAccess(content, permissions)
 *
 * // Generate GROQ filter for queries
 * const filter = adapter.generatePermissionsFilter(permissions, {
 *   prefix: '',
 *   showMembershipRestrictedContent: false
 * })
 * ```

 * ## Architecture
 *
 * - **PermissionsAdapter**: Abstract base class defining the contract
 * - **PermissionsV1Adapter**: Implementation for current permissions system
 * - **PermissionsV2Adapter**: Implementation for new permissions system (placeholder)
 * - **PermissionsAdapterFactory**: Factory for getting the appropriate adapter
 */

// Export the base class (runtime value)
export { PermissionsAdapter } from './PermissionsAdapter'

// Export TypeScript types only (not runtime values)
export type {
  UserPermissions,
  PermissionFilterOptions,
  ContentItem,
} from './PermissionsAdapter'

export { PermissionsV2Adapter } from './PermissionsV2Adapter'

// Export factory functions and version utilities (runtime values)
export {
  getPermissionsAdapter,
} from './PermissionsAdapterFactory'
