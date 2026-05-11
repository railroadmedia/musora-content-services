import { initializeTestDB } from '../initializeTestDB'
import {
  bubbleAndTrickleProgressesSafely,
  duplicateProgressToALaCarte,
  getIdsWhereLastAccessedFromMethod,
  getProgressState,
  handleLearningPathProgressActions,
} from '../../../src/services/contentProgress'
import { COLLECTION_ID_SELF, COLLECTION_TYPE } from '../../../src/services/sync/models/ContentProgress'
import db from '../../../src/services/sync/repository-proxy'

jest.mock('../../../src/services/sanity.js', () => require('./__mocks__/mocks').mockSanity())
jest.mock('../../../src/services/content-org/learning-paths.ts', () => require('./__mocks__/mocks').mockLearningPaths())
jest.mock('../../../src/services/awards/internal/content-progress-observer', () => require('./__mocks__/mocks').mockContentProgressObserver())
jest.mock('../../../src/services/progress-events', () => require('./__mocks__/mocks').mockProgressEvents())

const meta = { brand: 'drumeo', type: 'lesson', parent_id: 0 }
const collectionSelf = { type: COLLECTION_TYPE.SELF, id: COLLECTION_ID_SELF }
const collectionLP = (id: number) => ({ type: COLLECTION_TYPE.LEARNING_PATH, id })

const ctx = initializeTestDB()

const flushPromises = async () => {
  for (let i = 0; i < 200; i++) {
    await new Promise(resolve => setImmediate(resolve))
  }
}

// ─── bubbleAndTrickleProgressesSafely ─────────────────────────────────────────

describe('bubbleAndTrickleProgressesSafely', () => {
  test('non-reset writes records to DB', async () => {
    const progresses = { 101: 50, 102: 75 }
    const metadata = { 101: meta, 102: meta }
    await bubbleAndTrickleProgressesSafely(progresses, collectionSelf, metadata)
    expect(await getProgressState(101)).toBe('started')
    expect(await getProgressState(102)).toBe('started')
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('non-reset with correct progress values', async () => {
    const progresses = { 101: 50 }
    const metadata = { 101: meta }
    await bubbleAndTrickleProgressesSafely(progresses, collectionSelf, metadata)
    const record = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(record.data?.progress_percent).toBe(50)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('non-reset with empty progresses does not create records', async () => {
    await bubbleAndTrickleProgressesSafely({}, collectionSelf, {})
    const record = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(record.data).toBeNull()
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('reset action with all positive values writes records', async () => {
    const progresses = { 101: 50, 102: 75 }
    const metadata = { 101: meta, 102: meta }
    await bubbleAndTrickleProgressesSafely(progresses, collectionSelf, metadata, { isResetAction: true })
    expect(await getProgressState(101)).toBe('started')
    expect(await getProgressState(102)).toBe('started')
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('reset action with all zero values erases records', async () => {
    await db.contentProgress.recordProgress(101, null, 50, meta, undefined, { skipPush: true })
    expect(await getProgressState(101)).toBe('started')
    await bubbleAndTrickleProgressesSafely({ 101: 0 }, collectionSelf, {}, { isResetAction: true })
    expect(await getProgressState(101)).toBe('')
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('reset action with mixed values writes positive and erases zeros', async () => {
    await db.contentProgress.recordProgress(101, null, 50, meta, undefined, { skipPush: true })
    const metadata = { 102: meta }
    await bubbleAndTrickleProgressesSafely({ 101: 0, 102: 60 }, collectionSelf, metadata, { isResetAction: true })
    expect(await getProgressState(101)).toBe('')
    expect(await getProgressState(102)).toBe('started')
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('collection normalized — null collection writes to SELF', async () => {
    const progresses = { 101: 50 }
    const metadata = { 101: meta }
    await bubbleAndTrickleProgressesSafely(progresses, null as any, metadata)
    const record = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(record.data?.collection_type).toBe(COLLECTION_TYPE.SELF)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('bubble lowers parent from 100% to 50% via allowRegression', async () => {
    await db.contentProgress.recordProgress(1, null, 100, meta, undefined, { skipPush: true })
    expect((await db.contentProgress.getOneProgressByContentId(1, null)).data?.progress_percent).toBe(100)

    await bubbleAndTrickleProgressesSafely({ 1: 50 }, collectionSelf, { 1: meta })

    const record = await db.contentProgress.getOneProgressByContentId(1, null)
    expect(record.data?.progress_percent).toBe(50)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })
})

// ─── handleLearningPathProgressActions ────────────────────────────────────────

describe('handleLearningPathProgressActions', () => {
  const mockLearningPaths = jest.requireMock('../../../src/services/content-org/learning-paths.ts')

  beforeEach(() => {
    mockLearningPaths.onLearningPathCompletedActions.mockClear()
  })

  test('non-LP collection returns without action', async () => {
    await handleLearningPathProgressActions({ 101: 100 }, collectionSelf)
    await flushPromises()
    expect(mockLearningPaths.onLearningPathCompletedActions).not.toHaveBeenCalled()
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('LP id at 100% calls onLearningPathCompletedActions', async () => {
    await handleLearningPathProgressActions({ 200: 100 }, collectionLP(200))
    await flushPromises()
    expect(mockLearningPaths.onLearningPathCompletedActions).toHaveBeenCalledWith(200)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('non-LP-id child at 100% does not call onLearningPathCompletedActions', async () => {
    await handleLearningPathProgressActions({ 101: 100 }, collectionLP(200))
    await flushPromises()
    expect(mockLearningPaths.onLearningPathCompletedActions).not.toHaveBeenCalled()
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('LP id at <100% does not call onLearningPathCompletedActions', async () => {
    await handleLearningPathProgressActions({ 200: 50 }, collectionLP(200))
    await flushPromises()
    expect(mockLearningPaths.onLearningPathCompletedActions).not.toHaveBeenCalled()
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('LP id + children at 100% calls onLearningPathCompletedActions once for LP id only', async () => {
    await handleLearningPathProgressActions({ 200: 100, 101: 100, 102: 100 }, collectionLP(200))
    await flushPromises()
    expect(mockLearningPaths.onLearningPathCompletedActions).toHaveBeenCalledTimes(1)
    expect(mockLearningPaths.onLearningPathCompletedActions).toHaveBeenCalledWith(200)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('LP collection duplicates lesson progress to SELF records', async () => {
    await handleLearningPathProgressActions({ 101: 50 }, collectionLP(200))
    await flushPromises()
    const record = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(record.data?.progress_percent).toBe(50)
    expect(record.data?.collection_type).toBe(COLLECTION_TYPE.SELF)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })
})

// ─── duplicateProgressToALaCarte ─────────────────────────────────────────────

describe('duplicateProgressToALaCarte', () => {
  test('writes SELF records for a-la-carte collection', async () => {
    await duplicateProgressToALaCarte({ 101: 50 }, collectionSelf)
    await flushPromises()
    const record = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(record.data?.collection_type).toBe(COLLECTION_TYPE.SELF)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('LP collection excludes the LP id itself from duplication', async () => {
    await duplicateProgressToALaCarte({ 200: 50, 101: 75 }, collectionLP(200))
    await flushPromises()
    const lpRecord = await db.contentProgress.getOneProgressByContentId(200, null)
    const lessonRecord = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(lpRecord.data).toBeNull()
    expect(lessonRecord.data?.progress_percent).toBe(75)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('lower progress than existing is filtered — existing stays unchanged', async () => {
    await db.contentProgress.recordProgress(101, null, 80, meta, undefined, { skipPush: true })
    await duplicateProgressToALaCarte({ 101: 50 }, collectionSelf)
    await flushPromises()
    const record = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(record.data?.progress_percent).toBe(80)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('equal progress passes and record is updated', async () => {
    await db.contentProgress.recordProgress(101, null, 50, meta, undefined, { skipPush: true })
    await duplicateProgressToALaCarte({ 101: 50 }, collectionSelf)
    await flushPromises()
    const record = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(record.data?.progress_percent).toBe(50)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('empty progresses results in no new records', async () => {
    await duplicateProgressToALaCarte({}, collectionSelf)
    await flushPromises()
    const record = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(record.data).toBeNull()
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })
})

// ─── getIdsWhereLastAccessedFromMethod ────────────────────────────────────────

describe('getIdsWhereLastAccessedFromMethod', () => {
  test('returns content_ids from records where last_interacted_a_la_carte is null', async () => {
    await db.contentProgress.recordProgress(101, null, 50, meta, undefined, { skipPush: true, accessedDirectly: false })
    const result = await getIdsWhereLastAccessedFromMethod([101])
    expect(result).toContain(101)
  })

  test('returns empty array when no records match', async () => {
    const result = await getIdsWhereLastAccessedFromMethod([999])
    expect(result).toEqual([])
  })

  test('normalizes string content ids before querying', async () => {
    await db.contentProgress.recordProgress(101, null, 50, meta, undefined, { skipPush: true, accessedDirectly: false })
    const result = await getIdsWhereLastAccessedFromMethod(['101'] as any)
    expect(result).toContain(101)
  })
})

// ─── Scenario: LP lesson completion ───────────────────────────────────────────

describe('Scenario: LP lesson at 100% triggers completion and duplicates to a-la-carte', () => {
  const mockLearningPaths = jest.requireMock('../../../src/services/content-org/learning-paths.ts')

  beforeEach(() => {
    mockLearningPaths.onLearningPathCompletedActions.mockClear()
  })

  test('LP id 200 at 100% calls onLearningPathCompletedActions; lesson at 100% writes SELF record', async () => {
    await handleLearningPathProgressActions({ 200: 100, 101: 100 }, collectionLP(200))
    await flushPromises()
    expect(mockLearningPaths.onLearningPathCompletedActions).toHaveBeenCalledTimes(1)
    expect(mockLearningPaths.onLearningPathCompletedActions).toHaveBeenCalledWith(200)
    const selfRecord = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(selfRecord.data?.progress_percent).toBe(100)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })
})

describe('Scenario: Offline LP progress skips award check', () => {
  const mockLearningPaths = jest.requireMock('../../../src/services/content-org/learning-paths.ts')

  beforeEach(() => {
    mockLearningPaths.onLearningPathCompletedActions.mockClear()
  })

  test('isOffline=true writes SELF record but skips onLearningPathCompletedActions', async () => {
    await handleLearningPathProgressActions({ 101: 100 }, collectionLP(200), { isOffline: true })
    await flushPromises()
    expect(mockLearningPaths.onLearningPathCompletedActions).not.toHaveBeenCalled()
    const selfRecord = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(selfRecord.data?.progress_percent).toBe(100)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })
})
