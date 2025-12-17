import schema from '../schema'

import type SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import type LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'

export type DatabaseAdapter = SQLiteAdapter | LokiJSAdapter

type SQLiteAdapterOptions = ConstructorParameters<typeof SQLiteAdapter>[0]
type LokiJSAdapterOptions = ConstructorParameters<typeof LokiJSAdapter>[0]

type DatabaseAdapterOptions = SQLiteAdapterOptions & LokiJSAdapterOptions

export default function syncAdapterFactory<T extends DatabaseAdapter>(
  AdapterClass: new (options: DatabaseAdapterOptions) => T,
  namespace: string,
  opts: Omit<DatabaseAdapterOptions, 'schema' | 'migrations'>
): () => T {
  return () => new AdapterClass({
    ...opts,
    dbName: `sync:${namespace}`,
    schema,
    migrations: undefined
  })
}
