/**
 * @module PermissionsAdapterFactory
 *
 * Factory for creating the appropriate permissions adapter based on configuration.
 * Provides a single point of control for switching between v1 and v2 implementations.
 */

import { PermissionsAdapter } from './PermissionsAdapter'
import { PermissionsV1Adapter } from './PermissionsV1Adapter'
import { PermissionsV2Adapter } from './PermissionsV2Adapter'
import { globalConfig } from '../config.js'

/**
 * Valid permissions version types
 */
export type PermissionsVersion = 'v1' | 'v2'

/**
 * Singleton instance of the permissions adapter.
 * Created once and reused throughout the application.
 */
let adapterInstance: PermissionsAdapter | null = null

/**
 * Get the appropriate permissions adapter based on configuration.
 *
 * This is a singleton - the same adapter instance is returned on every call.
 * To switch versions, change globalConfig.permissionsVersion via initializeService().
 *
 * @returns The permissions adapter instance
 * @throws Error if an invalid permissions version is configured
 *
 * @example
 * import { getPermissionsAdapter } from './permissions/PermissionsAdapterFactory.js'
 *
 * const adapter = getPermissionsAdapter()
 * const permissions = await adapter.fetchUserPermissions()
 */
export function getPermissionsAdapter(): PermissionsAdapter {
  if (adapterInstance) {
    return adapterInstance
  }

  const version = (globalConfig.permissionsVersion || 'v1') as PermissionsVersion

  switch (version.toLowerCase()) {
    case 'v1':
      adapterInstance = new PermissionsV1Adapter()
      break

    case 'v2':
      adapterInstance = new PermissionsV2Adapter()
      break

    default:
      throw new Error(
        `Invalid permissionsVersion: ${version}. Must be 'v1' or 'v2'.`
      )
  }

  return adapterInstance
}

/**
 * Get the current permissions version being used.
 *
 * @returns The permissions version ('v1' or 'v2')
 */
export function getPermissionsVersion(): PermissionsVersion {
  return (globalConfig.permissionsVersion || 'v1') as PermissionsVersion
}
