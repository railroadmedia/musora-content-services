import { initializeTestDB } from '../initializeTestDB'
import {
  recordWatchSession,
  flushWatchSession,
  contentStatusCompleted,
  contentStatusReset,
} from '../../../src/services/contentProgress.js'
import { COLLECTION_TYPE, COLLECTION_ID_SELF, CollectionParameter } from '../../../src/services/sync/models/ContentProgress'
import db from '../../../src/services/sync/repository-proxy'
import { setHierarchy, clearHierarchies } from './__mocks__/mocks'
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

const ctx = initializeTestDB()

beforeEach(() => {
  clearHierarchies()
  learningPathsMock.onLearningPathCompletedActions.mockClear()
  learningPathsMock.getDailySession.mockClear()
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

async function writeSome(contentIds: Record<string, number>, collection: CollectionParameter = null) {
  const contentMetadataMap = Object.fromEntries(Object.keys(contentIds).map(id => [id, testMetadata]))
  await db.contentProgress.recordProgressMany(contentIds, collection, contentMetadataMap, {skipPush: true})
}

describe('contentStatusCompleted', () => {

  describe('a-la-carte collection', () => {
    test('singular a-la-carte lesson', async () => {
      await contentStatusCompleted(500)
      const record = await getOne(500, null)

      expectProgress(record, { percent: 100, collection: selfCollection })
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
    })

    test('child a-la-carte lesson', async () => {
      setHierarchy({
        id: 1, type: 'course', children: [
          { id: 100, type: 'lesson' },
          { id: 200, type: 'lesson' },
        ],
      })

      await contentStatusCompleted(100)

      const child = await getOne(100, null)
      const sibling = await getOne(200, null)
      const parent = await getOne(1, null)

      expectProgress(child, { percent: 100, collection: selfCollection })
      expect(sibling).toBeNull()
      expectProgress(parent, { percent: 50, collection: selfCollection })

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
    })

    test('a-la-carte course within a course-collection', async () => {
      setHierarchy({
        id: 1, type: 'course-collection', children: [
          { id: 10, type: 'course', children: [
            { id: 100, type: 'lesson' },
            { id: 200, type: 'lesson' },
          ]},
          { id: 20, type: 'course' },
        ],
      })

      await contentStatusCompleted(10)

      const course = await getOne(10, null)
      const child100 = await getOne(100, null)
      const child200 = await getOne(200, null)
      const sibling = await getOne(20, null)
      const collection = await getOne(1, null)

      expectProgress(course, { percent: 100, collection: selfCollection })
      expectProgress(child100, { percent: 100, collection: selfCollection })
      expectProgress(child200, { percent: 100, collection: selfCollection })
      expect(sibling).toBeNull()
      expectProgress(collection, { percent: 50, collection: selfCollection })

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
    })
  })

  describe('playlist collection', () => {
    test('singular lesson in playlist', async () => {
      await contentStatusCompleted(500, playlistCollection)

      const playlistRecord = await getOne(500, playlistCollection)
      const aLaCarteRecord = await getOne(500, null)

      expectProgress(aLaCarteRecord, { percent: 100, collection: selfCollection })
      expect(playlistRecord).toBeNull()

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
    })

    test('child lesson in playlist', async () => {
      setHierarchy({
        id: 1, type: 'course', children: [
          { id: 100, type: 'lesson' },
          { id: 200, type: 'lesson' },
        ],
      })

      await contentStatusCompleted(100, playlistCollection)

      const childALC = await getOne(100, null)
      const childPL = await getOne(100, playlistCollection)
      const siblingALC = await getOne(200, null)
      const parentALC = await getOne(1, null)

      expectProgress(childALC, { percent: 100, collection: selfCollection })
      expectProgress(parentALC, { percent: 50, collection: selfCollection })
      expect(siblingALC).toBeNull()
      expect(childPL).toBeNull()

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
    })
  })

  describe('learning path collection', () => {
    test('learning path lesson', async () => {
      setHierarchy({
        id: 50, type: 'course', children: [
          { id: 100, type: 'lesson' },
          { id: 200, type: 'lesson' },
        ],
      })
      setHierarchy({
        id: 999, type: 'learning-path-v2', children: [
          { id: 100, type: 'lesson' },
          { id: 300, type: 'lesson' },
        ],
      }, { lp: true })

      await contentStatusCompleted(100, lpCollection)

      const childLP = await getOne(100, lpCollection)
      const lpLP = await getOne(999, lpCollection)
      const childALC = await getOne(100, null)
      const parentALC = await getOne(50, null)
      const lpALC = await getOne(999, null)

      expectProgress(childLP, { percent: 100, collection: lpCollection })
      expectProgress(lpLP, { percent: 50, collection: lpCollection })
      expectProgress(childALC, { percent: 100, collection: selfCollection })
      expectProgress(parentALC, { percent: 50, collection: selfCollection })
      expect(lpALC).toBeNull()

      expect(learningPathsMock.onLearningPathCompletedActions).not.toHaveBeenCalled()

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
    })

    test('learning path', async () => {
      setHierarchy({
        id: 50, type: 'course', children: [
          { id: 100, type: 'lesson' },
          { id: 200, type: 'lesson' },
        ],
      })
      setHierarchy({
        id: 999, type: 'learning-path-v2', children: [
          { id: 100, type: 'lesson' },
          { id: 300, type: 'lesson' },
        ],
      }, { lp: true })

      await contentStatusCompleted(999, lpCollection)

      const lpLP = await getOne(999, lpCollection)
      const child1LP = await getOne(100, lpCollection)
      const child2LP = await getOne(300, lpCollection)
      const lpALC = await getOne(999, null)
      const child1ALC = await getOne(100, null)
      const child2ALC = await getOne(300, null)
      const orphanALC = await getOne(200, null)
      const parentALC = await getOne(50, null)

      expectProgress(lpLP, { percent: 100, collection: lpCollection })
      expectProgress(child1LP, { percent: 100, collection: lpCollection })
      expectProgress(child2LP, { percent: 100, collection: lpCollection })
      expect(lpALC).toBeNull()
      expectProgress(child1ALC, { percent: 100, collection: selfCollection })
      expectProgress(child2ALC, { percent: 100, collection: selfCollection })
      expect(orphanALC).toBeNull()
      expectProgress(parentALC, { percent: 50, collection: selfCollection })

      expect(learningPathsMock.onLearningPathCompletedActions).toHaveBeenCalledTimes(1)
      expect(learningPathsMock.onLearningPathCompletedActions).toHaveBeenCalledWith(999)

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
    })
  })
})

describe('contentStatusStarted', () => {})
// less important bcs very similar to `complete`. do later.

describe('contentStatusReset', () => {
  describe('a-la-carte collection', () => {
    test('reset singular a-la-carte lesson', async () => {
      await writeOne(500, 100)
      await contentStatusReset(500)

      const record = await getOne(500, null)

      expect(record).toBeNull()

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
    })

    test('reset child a-la-carte lesson', async () => {
      setHierarchy({
        id: 1, type: 'course', children: [
          { id: 100, type: 'lesson' },
          { id: 200, type: 'lesson' },
        ],
      })

      await writeSome({
        100: 100,
        200: 100,
        1: 100
      })
      await contentStatusReset(100)

      const child = await getOne(100, null)
      const sibling = await getOne(200, null)
      const parent = await getOne(1, null)

      expect(child).toBeNull()
      expectProgress(sibling, { percent: 100 })
      expectProgress(parent, { percent: 50 })

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
    })

    test('reset a-la-carte course within a course-collection', async () => {
      setHierarchy({
        id: 1, type: 'course-collection', children: [
          { id: 10, type: 'course', children: [
            { id: 100, type: 'lesson' },
            { id: 200, type: 'lesson' },
          ]},
          { id: 20, type: 'course' },
        ],
      })

      await writeSome({
        100: 100,
        200: 100,
        10: 100,
        20: 100,
        1: 100,
      })
      await contentStatusReset(10)

      const course = await getOne(10, null)
      const child100 = await getOne(100, null)
      const child200 = await getOne(200, null)
      const sibling = await getOne(20, null)
      const collection = await getOne(1, null)

      expect(course).toBeNull()
      expect(child100).toBeNull()
      expect(child200).toBeNull()
      expectProgress(sibling, { percent: 100 })
      expectProgress(collection, { percent: 50 })

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
    })
  })

  describe('playlist collection', () => {
    test('reset singular lesson in playlist', async () => {
      await writeOne(500, 100)

      await contentStatusReset(500)

      const aLaCarteRecord = await getOne(500, null)
      const playlistRecord = await getOne(500, playlistCollection)

      expect(aLaCarteRecord).toBeNull()
      expect(playlistRecord).toBeNull()

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
    })

    test('reset child lesson in playlist', async () => {
      setHierarchy({
        id: 1, type: 'course', children: [
          { id: 100, type: 'lesson' },
          { id: 200, type: 'lesson' },
        ],
      })

      await writeSome({
        100: 100,
        1: 50,
      })
      await contentStatusReset(100)

      const childALC = await getOne(100, null)
      const childPL = await getOne(100, playlistCollection)
      const parentALC = await getOne(1, null)

      expect(childALC).toBeNull()
      expect(childPL).toBeNull()
      expect(parentALC).toBeNull()

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
    })
  })

  describe('learning path collection', () => {
    test('reset learning path lesson', async () => {
      setHierarchy({
        id: 50, type: 'course', children: [
          { id: 100, type: 'lesson' },
          { id: 200, type: 'lesson' },
        ],
      })
      setHierarchy({
        id: 999, type: 'learning-path-v2', children: [
          { id: 100, type: 'lesson' },
          { id: 300, type: 'lesson' },
        ],
      }, { lp: true })

      await writeSome({
        100: 100,
        999: 50,
      }, lpCollection)
      await writeSome({
        100: 100,
        50: 50,
      })
      await contentStatusReset(100, lpCollection)

      const childLP = await getOne(100, lpCollection)
      const lpLP = await getOne(999, lpCollection)
      const childALC = await getOne(100, null)
      const parentALC = await getOne(50, null)
      const lpALC = await getOne(999, null)

      expect(childLP).toBeNull()
      expect(lpLP).toBeNull()
      expectProgress(childALC, { percent: 100 })
      expectProgress(parentALC, { percent: 50 })
      expect(lpALC).toBeNull()

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
    })

    test('reset learning path', async () => {
      setHierarchy({
        id: 50, type: 'course', children: [
          { id: 100, type: 'lesson' },
          { id: 200, type: 'lesson' },
        ],
      })
      setHierarchy({
        id: 999, type: 'learning-path-v2', children: [
          { id: 100, type: 'lesson' },
          { id: 300, type: 'lesson' },
        ],
      }, { lp: true })

      await writeSome({
        999: 100,
        100: 100,
        300: 100,
      }, lpCollection)
      await writeSome({
        100: 100,
        50: 50,
      })
      await contentStatusReset(999, lpCollection)

      const lpLP = await getOne(999, lpCollection)
      const child1LP = await getOne(100, lpCollection)
      const child2LP = await getOne(300, lpCollection)
      const child1ALC = await getOne(100, null)
      const child2ALC = await getOne(200, null)
      const parentALC = await getOne(50, null)
      const lpALC = await getOne(999, null)

      expect(lpLP).toBeNull()
      expect(child1LP).toBeNull()
      expect(child2LP).toBeNull()
      expectProgress(child1ALC, { percent: 100 })
      expect(child2ALC).toBeNull()
      expectProgress(parentALC, { percent: 50 })
      expect(lpALC).toBeNull()

      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledTimes(1)
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
    })
  })
})

describe('recordWatchSession', () => {

  describe('a-la-carte collection', () => {
    test('singular a-la-carte lesson, halfway', async () => {
      await recordWatchSession(500, null, 200, 100, 30)

      const record = await getOne(500, null)
      expectProgress(record, { percent: 50, collection: selfCollection })
      expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
    })

    test('singular a-la-carte lesson, watched to end clamps at 99', async () => {
      await recordWatchSession(500, null, 200, 200, 60)

      const record = await getOne(500, null)
      expectProgress(record, { percent: 99 })
      expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
    })

    test('child a-la-carte lesson bubbles to parent', async () => {
      setHierarchy({
        id: 1, type: 'course', children: [
          { id: 100, type: 'lesson' },
          { id: 200, type: 'lesson' },
        ],
      })

      await recordWatchSession(100, null, 200, 100, 30)

      const child = await getOne(100, null)
      const sibling = await getOne(200, null)
      const parent = await getOne(1, null)

      expectProgress(child, { percent: 50 })
      expect(sibling).toBeNull()
      expectProgress(parent, { percent: 25 })

      expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
    })

    test('flushWatchSession triggers push after watch', async () => {
      await recordWatchSession(500, null, 200, 100, 30)
      expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()

      await flushWatchSession()
      expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('flush-watch-session')
    })
  })

  describe('playlist collection', () => {
    test('singular lesson in playlist duplicates progress to a-la-carte via nested saveContentProgress', async () => {
      const playlistCollection = { type: COLLECTION_TYPE.PLAYLIST, id: 123 }

      await recordWatchSession(500, playlistCollection, 200, 100, 30)

      const aLaCarte = await getOne(500, null)
      const playlistRec = await getOne(500, playlistCollection)

      expectProgress(aLaCarte, { percent: 50, collection: selfCollection })
      expect(playlistRec).toBeNull()
      expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
    })

    test('child lesson in playlist duplicates and bubbles in a-la-carte', async () => {
      setHierarchy({
        id: 1, type: 'course', children: [
          { id: 100, type: 'lesson' },
          { id: 200, type: 'lesson' },
        ],
      })
      const playlistCollection = { type: COLLECTION_TYPE.PLAYLIST, id: 123 }

      await recordWatchSession(100, playlistCollection, 200, 100, 30)

      const childALC = await getOne(100, null)
      const childPL = await getOne(100, playlistCollection)
      const sibling = await getOne(200, null)
      const parentALC = await getOne(1, null)

      expectProgress(childALC, { percent: 50, collection: selfCollection })
      expect(childPL).toBeNull()
      expect(sibling).toBeNull()
      expectProgress(parentALC, { percent: 25, collection: selfCollection })

      expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
    })
  })

  describe('learning path collection', () => {
    test('child lesson in LP writes LP self+bubble, duplicates to a-la-carte and bubbles via nested saveContentProgress', async () => {
      setHierarchy({
        id: 50, type: 'course', children: [
          { id: 100, type: 'lesson' },
          { id: 200, type: 'lesson' },
        ],
      })
      setHierarchy({
        id: 999, type: 'learning-path-v2', children: [
          { id: 100, type: 'lesson' },
          { id: 300, type: 'lesson' },
        ],
      }, { lp: true })

      await recordWatchSession(100, lpCollection, 200, 100, 30)

      const childLP = await getOne(100, lpCollection)
      const lpLP = await getOne(999, lpCollection)
      const childALC = await getOne(100, null)
      const parentALC = await getOne(50, null)
      const lpALC = await getOne(999, null)

      expectProgress(childLP, { percent: 50, collection: lpCollection })
      expectProgress(lpLP, { percent: 25, collection: lpCollection })
      expectProgress(childALC, { percent: 50, collection: selfCollection })
      expectProgress(parentALC, { percent: 25, collection: selfCollection })
      expect(lpALC).toBeNull()

      expect(learningPathsMock.onLearningPathCompletedActions).not.toHaveBeenCalled()
      expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
    })

    test('watch session does not trickle: parent watch leaves children untouched', async () => {
      setHierarchy({
        id: 999, type: 'learning-path-v2', children: [
          { id: 100, type: 'lesson' },
          { id: 300, type: 'lesson' },
        ],
      }, { lp: true })

      await recordWatchSession(999, lpCollection, 200, 100, 30)

      const lpLP = await getOne(999, lpCollection)
      const child1LP = await getOne(100, lpCollection)
      const child2LP = await getOne(300, lpCollection)

      expectProgress(lpLP, { percent: 50, collection: lpCollection })
      expect(child1LP).toBeNull()
      expect(child2LP).toBeNull()

      expect(learningPathsMock.onLearningPathCompletedActions).not.toHaveBeenCalled()
      expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
    })
  })
})
