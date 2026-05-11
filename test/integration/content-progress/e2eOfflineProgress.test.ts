import { initializeTestDB } from '../initializeTestDB'
import {
  recordWatchSessionOffline,
  contentStatusCompletedOffline,
  contentStatusCompletedManyOffline,
  contentStatusStartedOffline,
  contentStatusResetOffline,
} from '../../../src/services/offline/progress'
import { flushWatchSession } from '../../../src/services/contentProgress.js'
import { COLLECTION_TYPE, COLLECTION_ID_SELF, CollectionParameter } from '../../../src/services/sync/models/ContentProgress'
import db from '../../../src/services/sync/repository-proxy'
import { setHierarchy, clearHierarchies, HierarchyTreeNode } from './__mocks__/mocks'
jest.mock('../../../src/services/sanity.js', () => require('./__mocks__/mocks').mockSanity())
jest.mock('../../../src/services/content-org/learning-paths.ts', () => require('./__mocks__/mocks').mockLearningPaths())
jest.mock('../../../src/services/awards/internal/content-progress-observer', () => require('./__mocks__/mocks').mockContentProgressObserver())
jest.mock('../../../src/services/progress-events', () => require('./__mocks__/mocks').mockProgressEvents())

jest.mock('../../../src/services/userActivity', () => ({
  trackUserPractice: jest.fn().mockResolvedValue(undefined),
}))

const selfCollection = { type: COLLECTION_TYPE.SELF, id: COLLECTION_ID_SELF }
const playlistCollection = { type: COLLECTION_TYPE.PLAYLIST, id: 123 }
const lpCollection = { type: COLLECTION_TYPE.LEARNING_PATH, id: 999 }

const testMetadata = { brand: 'test-brand', type: 'test-type', parent_id: 0 }

const learningPathsMock = jest.requireMock('../../../src/services/content-org/learning-paths.ts')
const sanityMock = jest.requireMock('../../../src/services/sanity.js')

const ctx = initializeTestDB()

beforeEach(() => {
  clearHierarchies()
  learningPathsMock.onLearningPathCompletedActions.mockClear()
  learningPathsMock.getDailySession.mockClear()
  sanityMock.getHierarchy.mockClear()
  sanityMock.getHierarchies.mockClear()
  sanityMock.getSanityDate.mockClear()
})

afterEach(() => {
  expect(sanityMock.getHierarchy).not.toHaveBeenCalled()
  expect(sanityMock.getHierarchies).not.toHaveBeenCalled()
  expect(sanityMock.getSanityDate).not.toHaveBeenCalled()
})

type ExpectedProgress = {
  state?: string
  percent?: number
  collection?: CollectionParameter
}

function expectProgress(data: any, expected: ExpectedProgress) {
  const expectedState = expected.state ?? (expected.percent === 100 ? 'completed' : 'started')
  expect(data).not.toBeNull()
  if (expected.state !== undefined) expect(data.state).toBe(expectedState)
  if (expected.percent !== undefined) expect(data.progress_percent).toBe(expected.percent)
  if (expected.collection !== undefined) expect(data.collection_type).toBe(expected.collection.type)
  if (expected.collection !== undefined) expect(data.collection_id).toBe(expected.collection.id)
}

async function getOne(contentId: number, collection: CollectionParameter = null) {
  const result = await db.contentProgress.getOneProgressByContentId(contentId, collection)
  return result.data
}

async function writeOne(contentId: number, progress: number, collection: CollectionParameter = null) {
  await db.contentProgress.recordProgress(contentId, collection, progress, testMetadata, 0, {skipPush: true})
}

function buildHierarchy(tree: HierarchyTreeNode) {
  const parents: Record<number, number> = {}
  const children: Record<number, number[]> = {}
  const metadata: Record<number, { type: string; brand: string; parent_id: number }> = {}

  function walk(node: HierarchyTreeNode, parentId: number) {
    const childIds = (node.children ?? []).map(c => c.id)
    metadata[node.id] = {
      type: node.type ?? 'lesson',
      brand: node.brand ?? 'drumeo',
      parent_id: parentId,
    }
    if (parentId) parents[node.id] = parentId
    if (childIds.length > 0) children[node.id] = childIds
    for (const c of node.children ?? []) walk(c, node.id)
  }
  walk(tree, 0)

  return { topLevelId: tree.id, parents, children, metadata }
}

const flatHierarchy = (contentId: number) => buildHierarchy({ id: contentId, type: 'lesson' })

const flatHierarchyForMany = (contentIds: number[]) => ({
  topLevelId: contentIds[0],
  parents: {},
  children: {},
  metadata: Object.fromEntries(contentIds.map(id => [id, { ...testMetadata }])),
})

describe('contentStatusCompletedOffline', () => {

  describe('a-la-carte collection', () => {
    test('singular a-la-carte lesson', async () => {
      await contentStatusCompletedOffline(500, null, flatHierarchy(500))
      const record = await getOne(500, null)

      expectProgress(record, { percent: 100, collection: selfCollection })
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
    })

    test('child a-la-carte lesson does NOT bubble to parent', async () => {
      const hierarchy = buildHierarchy({
        id: 1, type: 'course', children: [
          { id: 100, type: 'lesson' },
          { id: 200, type: 'lesson' },
        ],
      })

      await contentStatusCompletedOffline(100, null, hierarchy)

      const child = await getOne(100, null)
      const sibling = await getOne(200, null)
      const parent = await getOne(1, null)

      expectProgress(child, { percent: 100, collection: selfCollection })
      expect(sibling).toBeNull()
      expect(parent).toBeNull()

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
    })
  })

  describe('learning path collection', () => {
    test('learning path lesson writes LP record and duplicates to a-la-carte without bubbling', async () => {
      const hierarchy = buildHierarchy({
        id: 999, type: 'learning-path-v2', children: [
          { id: 100, type: 'lesson' },
          { id: 300, type: 'lesson' },
        ],
      })

      await contentStatusCompletedOffline(100, lpCollection, hierarchy)

      const childLP = await getOne(100, lpCollection)
      const lpLP = await getOne(999, lpCollection)
      const childALC = await getOne(100, null)
      const lpALC = await getOne(999, null)
      const siblingALC = await getOne(300, null)

      expectProgress(childLP, { percent: 100, collection: lpCollection })
      expect(lpLP).toBeNull()
      expectProgress(childALC, { percent: 100, collection: selfCollection })
      expect(lpALC).toBeNull()
      expect(siblingALC).toBeNull()

      expect(learningPathsMock.onLearningPathCompletedActions).not.toHaveBeenCalled()

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
    })

    // not possible to complete parents offline, currently
    // test('learning path completion writes LP record but skips onLearningPathCompletedActions (offline)', async () => {})
  })
})

describe('contentStatusCompletedManyOffline', () => {
  test('all ids written in a-la-carte', async () => {
    await contentStatusCompletedManyOffline(
      [50001, 50002, 50003],
      null,
      flatHierarchyForMany([50001, 50002, 50003]),
    )

    expectProgress(await getOne(50001, null), { percent: 100, collection: selfCollection })
    expectProgress(await getOne(50002, null), { percent: 100, collection: selfCollection })
    expectProgress(await getOne(50003, null), { percent: 100, collection: selfCollection })

    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
  })
})

describe('contentStatusStartedOffline', () => {
  test('singular a-la-carte lesson started', async () => {
    await contentStatusStartedOffline(500, null, flatHierarchy(500))
    const record = await getOne(500, null)

    expectProgress(record, { percent: 0, state: 'started', collection: selfCollection })
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
  })
})

describe('contentStatusResetOffline', () => {
  describe('a-la-carte collection', () => {
    test('reset singular a-la-carte lesson', async () => {
      await writeOne(500, 100)
      await contentStatusResetOffline(500)

      const record = await getOne(500, null)

      expect(record).toBeNull()

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
    })

    test('reset child a-la-carte lesson does NOT touch parent', async () => {
      await writeOne(100, 100)
      await writeOne(200, 100)
      await writeOne(1, 100)

      await contentStatusResetOffline(100)

      const child = await getOne(100, null)
      const sibling = await getOne(200, null)
      const parent = await getOne(1, null)

      expect(child).toBeNull()
      expectProgress(sibling, { percent: 100 })
      expectProgress(parent, { percent: 100 })

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
    })
  })

  describe('learning path collection', () => {
    test('reset learning path lesson removes LP record only', async () => {
      await writeOne(100, 100, lpCollection)
      await writeOne(999, 50, lpCollection)
      await writeOne(100, 100)
      await writeOne(50, 50)

      await contentStatusResetOffline(100, lpCollection)

      const childLP = await getOne(100, lpCollection)
      const lpLP = await getOne(999, lpCollection)
      const childALC = await getOne(100, null)
      const parentALC = await getOne(50, null)

      expect(childLP).toBeNull()
      expectProgress(lpLP, { percent: 50 })
      expectProgress(childALC, { percent: 100 })
      expectProgress(parentALC, { percent: 50 })

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
    })
  })
})

describe('recordWatchSessionOffline', () => {

  describe('a-la-carte collection', () => {
    test('singular a-la-carte lesson, halfway', async () => {
      await recordWatchSessionOffline(500, 200, 100, 30, flatHierarchy(500))

      const record = await getOne(500, null)
      expectProgress(record, { percent: 50, collection: selfCollection })
      expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
    })

    test('singular a-la-carte lesson, watched to end clamps at 99', async () => {
      await recordWatchSessionOffline(500, 200, 200, 60, flatHierarchy(500))

      const record = await getOne(500, null)
      expectProgress(record, { percent: 99 })
      expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
    })

    test('child a-la-carte lesson does NOT bubble to parent', async () => {
      const hierarchy = buildHierarchy({
        id: 1, type: 'course', children: [
          { id: 100, type: 'lesson' },
          { id: 200, type: 'lesson' },
        ],
      })

      await recordWatchSessionOffline(100, 200, 100, 30, hierarchy)

      const child = await getOne(100, null)
      const sibling = await getOne(200, null)
      const parent = await getOne(1, null)

      expectProgress(child, { percent: 50 })
      expect(sibling).toBeNull()
      expect(parent).toBeNull()

      expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
    })

    test('flushWatchSession triggers push after offline watch', async () => {
      await recordWatchSessionOffline(500, 200, 100, 30, flatHierarchy(500))
      expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()

      await flushWatchSession()
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('flush-watch-session')
    })
  })

  describe('playlist collection', () => {
    test('singular lesson in playlist duplicates progress to a-la-carte', async () => {
      await recordWatchSessionOffline(500, 200, 100, 30, flatHierarchy(500), {
        collection: playlistCollection,
      })

      const aLaCarte = await getOne(500, null)
      const playlistRec = await getOne(500, playlistCollection)

      expectProgress(aLaCarte, { percent: 50, collection: selfCollection })
      expect(playlistRec).toBeNull()
      expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
    })
  })

  describe('learning path collection', () => {
    test('child lesson in LP writes LP record, duplicates to a-la-carte, no bubble', async () => {
      const hierarchy = buildHierarchy({
        id: 999, type: 'learning-path-v2', children: [
          { id: 100, type: 'lesson' },
          { id: 300, type: 'lesson' },
        ],
      })

      await recordWatchSessionOffline(100, 200, 100, 30, hierarchy, {
        collection: lpCollection,
      })

      const childLP = await getOne(100, lpCollection)
      const lpLP = await getOne(999, lpCollection)
      const childALC = await getOne(100, null)
      const lpALC = await getOne(999, null)

      expectProgress(childLP, { percent: 50, collection: lpCollection })
      expect(lpLP).toBeNull()
      expectProgress(childALC, { percent: 50, collection: selfCollection })
      expect(lpALC).toBeNull()

      expect(learningPathsMock.onLearningPathCompletedActions).not.toHaveBeenCalled()
      expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
    })
  })
})
