import type { DatabaseAdapter } from '../adapters/factory'
import { Database, } from '@nozbe/watermelondb'
import * as modelClasses from '../models'

export default function syncDatabaseFactory(adapter: () => DatabaseAdapter) {
  return () => new Database({
    adapter: adapter(),
    modelClasses: Object.values(modelClasses)
  })
}
