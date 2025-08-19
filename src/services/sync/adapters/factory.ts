import schema from '../schema'

import type SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import type LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
type SQLiteAdapterOptions = ConstructorParameters<typeof SQLiteAdapter>[0]
type LokiJSAdapterOptions = ConstructorParameters<typeof LokiJSAdapter>[0]

export type DatabaseAdapter = SQLiteAdapter | LokiJSAdapter
type DatabaseAdapterOptions = SQLiteAdapterOptions | LokiJSAdapterOptions
type StrictDatabaseAdapterOptions = Omit<DatabaseAdapterOptions, 'schema' | 'migrations'>

export default function syncAdapterFactory<T extends DatabaseAdapter>(
  AdapterClass: new (options: DatabaseAdapterOptions) => T,
  opts: StrictDatabaseAdapterOptions
): T {
  // Disallow schema and migrations being passed in
  const options = {
    ...opts,
    schema,
    migrations: undefined
  }
  return new AdapterClass(options)
}
