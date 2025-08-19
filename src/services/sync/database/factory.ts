import type { DatabaseAdapter } from '../adapters/factory'
import { Database } from '@nozbe/watermelondb'

// TODO - fix this once we don't have mcs build-index constraint (i.e., a models/index.ts file)
import ContentLike from '../models/ContentLike'
import ContentProgress from '../models/ContentProgress'
import ContentPractice from '../models/ContentPractice'

type ModelClasses = typeof ContentLike | typeof ContentProgress | typeof ContentPractice

export default function syncDatabaseFactory(adapter: DatabaseAdapter, modelClasses: ModelClasses[]) {
  return new Database({
    adapter,
    modelClasses
  })
}
