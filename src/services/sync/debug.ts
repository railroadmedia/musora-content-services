import { Database } from '@nozbe/watermelondb'

/**
 * Debug utilities for sync system testing and development.
 * These functions should only be used in development/testing environments.
 */

/**
 * Completely purges the WatermelonDB database by deleting the underlying IndexedDB.
 * WARNING: This will permanently delete ALL data in the database.
 * Only works with Loki adapter.
 */
export function purgeDatabase(database: Database): void {
  const driver = (database.adapter.underlyingAdapter as any)._driver as any
  if (!('loki' in driver)) {
    throw new Error('Only Loki databases are purgeable')
  }

  const idb = driver.loki.persistenceAdapter.idb
  idb.close()
  window.indexedDB.deleteDatabase(idb.name)
  window.indexedDB.deleteDatabase('WatermelonIDBChecker')
}

/**
 * Disconnects the database connection, optionally disabling automatic reconnection.
 * Useful for testing offline scenarios or connection handling.
 * Only works with Loki adapter.
 */
export function disconnectDatabase(database: Database, disableReconnect = false): void {
  const driver = (database.adapter.underlyingAdapter as any)._driver as any
  if (!('loki' in driver)) {
    throw new Error('Only Loki databases are disconnectable')
  }

  const idb = driver.loki.persistenceAdapter.idb
  idb.close()

  if (disableReconnect) {
    idb._disableReconnect = true
  }
}
