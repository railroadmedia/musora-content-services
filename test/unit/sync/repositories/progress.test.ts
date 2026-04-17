// Break circular dep: sync/index → manager → award chain → UserAwardProgressRepository
// extends SyncRepository before it's defined in the module evaluation order.
jest.mock('../../../../src/services/sync/manager', () => ({ default: class SyncManager {} }))
jest.mock('../../../../src/services/sync/repository-proxy', () => ({ db: {} }))

import { Database } from '@nozbe/watermelondb'
import { makeDatabase, makeStore, resetDatabase } from '../helpers/index'
import ContentProgress, {
  COLLECTION_TYPE,
  COLLECTION_ID_SELF,
  STATE,
} from '../../../../src/services/sync/models/ContentProgress'
import ProgressRepository from '../../../../src/services/sync/repositories/content-progress'

let db: Database
let repo: ProgressRepository

const BRAND = 'drumeo'
const TYPE = 'lesson'

function upsertProgress(
  contentId: number,
  progressPct: number,
  overrides: Partial<{
    collection: { type: COLLECTION_TYPE; id: number }
    brand: string
    contentType: string
    parentId: number
    lastInteractedALaCarte: number | null
  }> = {}
) {
  const id = ContentProgress.generateId(contentId, overrides.collection ?? null)
  return repo['store'].upsertOne(id, r => {
    r.content_id = contentId
    r.content_brand = overrides.brand ?? BRAND
    r.content_type = overrides.contentType ?? TYPE
    r.content_parent_id = overrides.parentId ?? 0
    r.collection_type = overrides.collection?.type ?? COLLECTION_TYPE.SELF
    r.collection_id = overrides.collection?.id ?? COLLECTION_ID_SELF
    r.progress_percent = progressPct
    if (overrides.lastInteractedALaCarte !== undefined) {
      r.last_interacted_a_la_carte = overrides.lastInteractedALaCarte
    }
  })
}

beforeEach(() => {
  db = makeDatabase()
  const { store } = makeStore(ContentProgress, db)
  repo = new ProgressRepository(store)
})

afterEach(async () => {
  await resetDatabase(db)
})

// ---

describe('started / completed', () => {
  test('started returns records with started state', async () => {
    await upsertProgress(100, 50)   // started
    await upsertProgress(101, 100)  // completed
    await upsertProgress(102, 30)   // started

    const result = await repo.started()
    expect(result.map(r => r.content_id).sort()).toEqual([100, 102])
  })

  test('completed returns records with completed state', async () => {
    await upsertProgress(200, 100)  // completed
    await upsertProgress(201, 50)   // started
    await upsertProgress(202, 100)  // completed

    const result = await repo.completed()
    expect(result.map(r => r.content_id).sort()).toEqual([200, 202])
  })

  test('started with limit respects limit', async () => {
    await Promise.all([1, 2, 3, 4, 5].map(id => upsertProgress(id, 50)))

    const result = await repo.started(2)
    expect(result).toHaveLength(2)
  })

  test('started with onlyIds returns content_id array', async () => {
    await upsertProgress(300, 50)

    const result = await repo.started(undefined, { onlyIds: true })
    expect(result).toContain(300)
  })
})

describe('startedOrCompleted', () => {
  test('returns all started and completed records', async () => {
    await upsertProgress(400, 50)   // started
    await upsertProgress(401, 100)  // completed
    await upsertProgress(402, 30)   // started

    const result = await repo.startedOrCompleted()
    expect(result.data.map(r => r.content_id).sort()).toEqual([400, 401, 402])
  })

  test('filters by brand', async () => {
    await upsertProgress(500, 50, { brand: 'drumeo' })
    await upsertProgress(501, 50, { brand: 'pianote' })

    const result = await repo.startedOrCompleted({ brand: 'drumeo' })
    expect(result.data).toHaveLength(1)
    expect(result.data[0].content_id).toBe(500)
  })

  test('filters by updatedAfter', async () => {
    const now = Date.now()
    await upsertProgress(600, 50)

    // Record updated_at is set by BaseModel._prepareCreate to Date.now()
    const result = await repo.startedOrCompleted({ updatedAfter: now - 1000 })
    expect(result.data.length).toBeGreaterThanOrEqual(1)

    const resultFuture = await repo.startedOrCompleted({ updatedAfter: now + 60000 })
    expect(resultFuture.data).toHaveLength(0)
  })
})

describe('collectionTypeFilter', () => {
  test('no filter returns all collection types', async () => {
    await upsertProgress(700, 50)
    await upsertProgress(700, 50, { collection: { type: COLLECTION_TYPE.LEARNING_PATH, id: 99 } })

    const result = await repo.started()
    expect(result).toHaveLength(2)
  })

  test('aLaCarte filter returns only self-accessed records with lastInteractedALaCarte set', async () => {
    const now = Date.now()
    await upsertProgress(800, 50, { lastInteractedALaCarte: now })                      // aLaCarte accessed
    await upsertProgress(801, 50, { lastInteractedALaCarte: null })                     // not aLaCarte
    await upsertProgress(800, 50, { collection: { type: COLLECTION_TYPE.LEARNING_PATH, id: 42 } }) // LP

    const result = await repo.started(undefined, { include: { aLaCarte: true } })
    const ids = result.map(r => r.content_id)
    expect(ids).toContain(800)
    expect(ids).not.toContain(801)
  })

  test('learningPaths filter returns LP parent records', async () => {
    // LP parent: collection_type=learning-path-v2 AND content_id === collection_id
    await upsertProgress(900, 50, { collection: { type: COLLECTION_TYPE.LEARNING_PATH, id: 900 } }) // parent
    await upsertProgress(901, 50, { collection: { type: COLLECTION_TYPE.LEARNING_PATH, id: 900 } }) // child
    await upsertProgress(900, 50)  // self record for same content

    const result = await repo.started(undefined, { include: { learningPaths: true } })
    const ids = result.map(r => r.content_id)
    expect(ids).toContain(900)
    // child (content_id 901, collection_id 900) should NOT be in result
    expect(ids).not.toContain(901)
  })
})

describe('getOneProgressByContentId', () => {
  test('returns record for matching contentId', async () => {
    await upsertProgress(1000, 75)

    const result = await repo.getOneProgressByContentId(1000)
    expect(result.data).not.toBeNull()
    expect(result.data!.content_id).toBe(1000)
    expect(result.data!.progress_percent).toBe(75)
  })

  test('returns null when no record', async () => {
    const result = await repo.getOneProgressByContentId(9999)
    expect(result.data).toBeNull()
  })
})

describe('getSomeProgressByContentIds', () => {
  test('returns multiple records', async () => {
    await upsertProgress(1100, 50)
    await upsertProgress(1101, 100)
    await upsertProgress(1102, 30)

    const result = await repo.getSomeProgressByContentIds([1100, 1101])
    expect(result.data).toHaveLength(2)
    expect(result.data.map(r => r.content_id).sort()).toEqual([1100, 1101])
  })
})

describe('recordProgress', () => {
  test('creates progress record via repository', async () => {
    await repo.recordProgress(1200, null, 60, { brand: BRAND, type: TYPE, parent_id: 0 })

    const result = await repo.getOneProgressByContentId(1200)
    expect(result.data!.progress_percent).toBe(60)
    expect(result.data!.state).toBe(STATE.STARTED)
  })

  test('sets state to completed at 100%', async () => {
    await repo.recordProgress(1300, null, 100, { brand: BRAND, type: TYPE, parent_id: 0 })

    const result = await repo.getOneProgressByContentId(1300)
    expect(result.data!.state).toBe(STATE.COMPLETED)
  })

  test('progress_percent never goes backwards', async () => {
    await repo.recordProgress(1400, null, 80, { brand: BRAND, type: TYPE, parent_id: 0 })
    await repo.recordProgress(1400, null, 40, { brand: BRAND, type: TYPE, parent_id: 0 })

    const result = await repo.getOneProgressByContentId(1400)
    expect(result.data!.progress_percent).toBe(80)
  })
})

describe('eraseProgress', () => {
  test('removes the record', async () => {
    await upsertProgress(1500, 50)
    await repo.eraseProgress(1500, null)

    const result = await repo.getOneProgressByContentId(1500)
    expect(result.data).toBeNull()
  })
})

describe('mostRecentlyUpdatedId', () => {
  test('returns id of most recently updated record', async () => {
    await upsertProgress(1600, 50)
    // Small delay so updated_at differs
    await new Promise(r => setTimeout(r, 2))
    await upsertProgress(1601, 50)

    const result = await repo.mostRecentlyUpdatedId([1600, 1601])
    // 1601 was updated last
    expect(result.data).toBe(ContentProgress.generateId(1601, null))
  })
})

describe('completedByContentIds', () => {
  test('returns only completed records in the provided set', async () => {
    await upsertProgress(1700, 100)  // completed
    await upsertProgress(1701, 50)   // started
    await upsertProgress(1702, 100)  // completed

    const result = await repo.completedByContentIds([1700, 1701, 1702])
    expect(result.data.map(r => r.content_id).sort()).toEqual([1700, 1702])
  })
})
