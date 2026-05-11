import { initializeTestDB } from '../initializeTestDB'
import {
  contentStatusCompletedManyOffline,
  contentStatusCompletedOffline,
  contentStatusResetOffline,
  contentStatusStartedOffline,
  duplicateProgressToALaCarteOffline,
  recordWatchSessionOffline,
} from '../../../src/services/offline/progress'
import { getProgressState } from '../../../src/services/contentProgress.js'
import { COLLECTION_ID_SELF, COLLECTION_TYPE } from '../../../src/services/sync/models/ContentProgress'
import db from '../../../src/services/sync/repository-proxy'

jest.mock('../../../src/services/sanity.js', () => require('./__mocks__/mocks').mockSanity())
jest.mock('../../../src/services/content-org/learning-paths.ts', () => require('./__mocks__/mocks').mockLearningPaths())
jest.mock('../../../src/services/awards/internal/content-progress-observer', () => require('./__mocks__/mocks').mockContentProgressObserver())
jest.mock('../../../src/services/progress-events', () => require('./__mocks__/mocks').mockProgressEvents())

jest.mock('../../../src/services/userActivity', () => ({
  trackUserPractice: jest.fn().mockResolvedValue(undefined),
}))

const meta = { brand: 'drumeo', type: 'lesson', parent_id: 0 }
const collectionSelf = { type: COLLECTION_TYPE.SELF, id: COLLECTION_ID_SELF }
const collectionLP = (id: number) => ({ type: COLLECTION_TYPE.LEARNING_PATH, id })

const flushPromises = async () => {
  for (let i = 0; i < 200; i++) {
    await new Promise(resolve => setImmediate(resolve))
  }
}

const hierarchyFor = (contentId: number) => ({
  topLevelId: contentId,
  parents: {},
  children: {},
  metadata: { [contentId]: meta },
})

const ctx = initializeTestDB()

// ─── contentStatusCompletedOffline ────────────────────────────────────────────

describe('contentStatusCompletedOffline', () => {
  test('sets state to completed in DB', async () => {
    await contentStatusCompletedOffline(500, null, hierarchyFor(500))
    expect(await getProgressState(500)).toBe('completed')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
  })

  test('sets progress_percent to 100 in DB', async () => {
    await contentStatusCompletedOffline(500, null, hierarchyFor(500))
    const record = await db.contentProgress.getOneProgressByContentId(500, null)
    expect(record.data?.progress_percent).toBe(100)
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
  })

  test('defaults to SELF collection when null is passed', async () => {
    await contentStatusCompletedOffline(500, null, hierarchyFor(500))
    const record = await db.contentProgress.getOneProgressByContentId(500, null)
    expect(record.data?.collection_type).toBe(COLLECTION_TYPE.SELF)
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
  })
})

// ─── contentStatusCompletedManyOffline ────────────────────────────────────────

describe('contentStatusCompletedManyOffline', () => {
  test('sets all ids to completed state in DB', async () => {
    const hierarchy = {
      topLevelId: 501,
      parents: {},
      children: {},
      metadata: { 501: meta, 502: meta, 503: meta },
    }
    await contentStatusCompletedManyOffline([501, 502, 503], null, hierarchy)
    expect(await getProgressState(501)).toBe('completed')
    expect(await getProgressState(502)).toBe('completed')
    expect(await getProgressState(503)).toBe('completed')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
  })

  test('each record has progress_percent of 100', async () => {
    const hierarchy = {
      topLevelId: 501,
      parents: {},
      children: {},
      metadata: { 501: meta, 502: meta },
    }
    await contentStatusCompletedManyOffline([501, 502], null, hierarchy)
    const r1 = await db.contentProgress.getOneProgressByContentId(501, null)
    const r2 = await db.contentProgress.getOneProgressByContentId(502, null)
    expect(r1.data?.progress_percent).toBe(100)
    expect(r2.data?.progress_percent).toBe(100)
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
  })
})

// ─── contentStatusStartedOffline ──────────────────────────────────────────────

describe('contentStatusStartedOffline', () => {
  test('sets state to started in DB', async () => {
    await contentStatusStartedOffline(600, null, hierarchyFor(600))
    expect(await getProgressState(600)).toBe('started')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
  })

  test('sets progress_percent to 0 in DB', async () => {
    await contentStatusStartedOffline(600, null, hierarchyFor(600))
    const record = await db.contentProgress.getOneProgressByContentId(600, null)
    expect(record.data?.progress_percent).toBe(0)
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
  })
})

// ─── contentStatusResetOffline ────────────────────────────────────────────────

describe('contentStatusResetOffline', () => {
  test('removes record from DB so getProgressState returns empty string', async () => {
    await contentStatusCompletedOffline(700, null, hierarchyFor(700))
    expect(await getProgressState(700)).toBe('completed')
    await contentStatusResetOffline(700)
    expect(await getProgressState(700)).toBe('')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
  })

  test('defaults to SELF collection when called without collection', async () => {
    await db.contentProgress.recordProgress(701, null, 80, meta, undefined, { skipPush: true })
    await contentStatusResetOffline(701)
    expect(await getProgressState(701)).toBe('')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
  })
})

// ─── recordWatchSessionOffline ────────────────────────────────────────────────

describe('recordWatchSessionOffline', () => {
  const mockUserActivity = jest.requireMock('../../../src/services/userActivity')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('writes progress to DB and calls trackUserPractice', async () => {
    await recordWatchSessionOffline(234, 200, 100, 30, hierarchyFor(234))
    const record = await db.contentProgress.getOneProgressByContentId(234, null)
    expect(record.data?.progress_percent).toBe(50)
    expect(mockUserActivity.trackUserPractice).toHaveBeenCalledWith(234, 30, expect.any(Object))
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('normalizes string contentId to number in DB', async () => {
    await recordWatchSessionOffline('234' as any, 200, 100, 30, hierarchyFor(234))
    const record = await db.contentProgress.getOneProgressByContentId(234, null)
    expect(record.data?.content_id).toBe(234)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('full duration (200/200) clamps to 99 — never reaches 100 via watch', async () => {
    await recordWatchSessionOffline(234, 200, 200, 60, hierarchyFor(234))
    const record = await db.contentProgress.getOneProgressByContentId(234, null)
    expect(record.data?.progress_percent).toBe(99)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('passes instrumentId and categoryId through to trackUserPractice', async () => {
    await recordWatchSessionOffline(234, 200, 100, 30, hierarchyFor(234), {
      instrumentId: 7,
      categoryId: 9,
    })
    expect(mockUserActivity.trackUserPractice).toHaveBeenCalledWith(
      234,
      30,
      expect.objectContaining({ instrumentId: 7, categoryId: 9 }),
    )
  })
})

// ─── duplicateProgressToALaCarteOffline ───────────────────────────────────────

describe('duplicateProgressToALaCarteOffline', () => {
  test('writes SELF records for a-la-carte collection', async () => {
    await duplicateProgressToALaCarteOffline({ 101: 50 }, { 101: meta }, collectionSelf)
    await flushPromises()
    const record = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(record.data?.collection_type).toBe(COLLECTION_TYPE.SELF)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('LP collection excludes the LP id itself from duplication', async () => {
    await duplicateProgressToALaCarteOffline({ 200: 50, 101: 75 }, { 200: meta, 101: meta }, collectionLP(200))
    await flushPromises()
    const lpRecord = await db.contentProgress.getOneProgressByContentId(200, null)
    const lessonRecord = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(lpRecord.data).toBeNull()
    expect(lessonRecord.data?.progress_percent).toBe(75)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('lower progress than existing is filtered — existing stays unchanged', async () => {
    await db.contentProgress.recordProgress(101, null, 80, meta, undefined, { skipPush: true })
    await duplicateProgressToALaCarteOffline({ 101: 50 }, { 101: meta }, collectionSelf)
    await flushPromises()
    const record = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(record.data?.progress_percent).toBe(80)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('equal progress passes and record is updated', async () => {
    await db.contentProgress.recordProgress(101, null, 50, meta, undefined, { skipPush: true })
    await duplicateProgressToALaCarteOffline({ 101: 50 }, { 101: meta }, collectionSelf)
    await flushPromises()
    const record = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(record.data?.progress_percent).toBe(50)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('empty progresses results in no new records', async () => {
    await duplicateProgressToALaCarteOffline({}, {}, collectionSelf)
    await flushPromises()
    const record = await db.contentProgress.getOneProgressByContentId(101, null)
    expect(record.data).toBeNull()
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })
})
