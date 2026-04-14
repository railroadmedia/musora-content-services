import schema from '../schema'
import migrations from '../schema/migrations'
import type { SyncUserScope } from '../index'
import { SyncError } from '../errors'
import { globalConfig } from '../../config.js'

import type { default as SQLiteAdapter, SQLiteExtensions } from './sqlite'
import type { default as LokiJSAdapter, LokiExtensions } from './lokijs'

export type DatabaseAdapter = SQLiteAdapter | LokiJSAdapter

type SQLiteAdapterOptions = ConstructorParameters<typeof SQLiteAdapter>[0]
type LokiJSAdapterOptions = ConstructorParameters<typeof LokiJSAdapter>[0]

type DatabaseAdapterOptions = SQLiteAdapterOptions & LokiJSAdapterOptions

export default function syncAdapterFactory<T extends DatabaseAdapter, E = SQLiteExtensions | LokiExtensions>(
  AdapterClass: new (options: DatabaseAdapterOptions, extensions?: E) => T,
  opts: Omit<DatabaseAdapterOptions, 'schema' | 'migrations'>,
  extensions?: E
): (userScope: SyncUserScope) => T {
  // IMPORTANT: we rely on namespaced databases to prevent data clobbering
  // when localStorage.userId somehow changes outside of an explicit, app-managed logout
  // the system always checks on writes, pushes, and pulls that the localstorage.userId matches the userScope.initialId
  // but without namespaced dbs, that would not be sufficient to prevent a database with data for user A
  // from later masquerading as a database for user B

  // This also allows us to keep the entire setup flow synchronous and lazy
  // i.e., no checks necessary on database initialization comparing the previous/stored userId to the new/intended/current userId
  // (and a panicked resetting if those checks fail)

  return (userScope: SyncUserScope) => {
    if (!userScope.initialId) {
      throw new SyncError('User ID is required to construct database adapter')
    }

    const envName = globalConfig.appEnv || 'production'
    const dbSuffix = envName === 'production' ? '' : (':' + (envName))
    const adapter = new AdapterClass({
      ...opts,
      dbName: `musora:sync:${userScope.initialId}${dbSuffix}`,
      schema,
      migrations
    }, extensions)

    return adapter
  }
}
