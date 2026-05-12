import type { DatabaseAdapter } from '../adapters/factory'
import { Database } from '@nozbe/watermelondb'
import * as modelClasses from '../models'
import type { SyncUserScope } from '../index'

export default function syncDatabaseFactory(adapter: (userScope: SyncUserScope) => DatabaseAdapter, { onInitError }: { onInitError?: (error: Error) => void } = {}) {
  return (userScope: SyncUserScope) => {
    try {
      return new Database({
        adapter: adapter(userScope),
        modelClasses: Object.values(modelClasses)
      })
    } catch (error) {
      onInitError?.(error as Error)
      throw error
    }
  }
}
