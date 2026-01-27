/**
 * @module PermissionsAdapterFactory
 *
 * Factory for creating the appropriate permissions adapter based on configuration.
 * Provides a single point of control for switching between v1 and v2 implementations.
 */

import { PermissionsAdapter } from './PermissionsAdapter'
import { PermissionsV2Adapter } from './PermissionsV2Adapter'
import { globalConfig } from '../config.js'


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
  adapterInstance = new PermissionsV2Adapter()
  return adapterInstance
}
