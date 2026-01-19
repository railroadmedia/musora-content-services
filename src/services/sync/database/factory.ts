import type { DatabaseAdapter } from '../adapters/factory'
import { Database } from '@nozbe/watermelondb'
import * as modelClasses from '../models'

export default function syncDatabaseFactory(adapter: () => DatabaseAdapter, { onInitError }: { onInitError?: (error: Error) => void } = {}) {
  return () => {
    try {
      return new Database({
        adapter: adapter(),
        modelClasses: Object.values(modelClasses)
      })
    } catch (error) {
      onInitError?.(error as Error)
      throw error
    }
  }
}
