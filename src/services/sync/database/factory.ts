import type { DatabaseAdapter } from '../adapters/factory'
import { Database, Model } from '@nozbe/watermelondb'

export default function syncDatabaseFactory(adapter: () => DatabaseAdapter, modelClasses: (typeof Model)[]) {
  return () => new Database({
    adapter: adapter(),
    modelClasses
  })
}
