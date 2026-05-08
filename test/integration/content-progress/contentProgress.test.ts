import { initializeTestDB } from '../initializeTestDB'
import {
  recordWatchSession,
  _recordWatchSession,
  flushWatchSession,
  trackProgress,
  contentStatusCompleted,
  contentStatusCompletedMany,
  contentStatusStarted,
  contentStatusReset,
  saveContentProgress,
  setStartedOrCompletedStatus,
  setStartedOrCompletedStatusMany,
  resetStatus,
  getProgressState,
} from '../../../src/services/contentProgress.js'
import { COLLECTION_TYPE, COLLECTION_ID_SELF } from '../../../src/services/sync/models/ContentProgress'
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

const ctx = initializeTestDB()

// ─── contentStatusCompleted ───────────────────────────────────────────────────

describe('contentStatusCompleted', () => {
  test('sets state to completed in DB', async () => {
    await contentStatusCompleted(500)
    expect(await getProgressState(500)).toBe('completed')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
  })

  test('sets progress_percent to 100 in DB', async () => {
    await contentStatusCompleted(500)
    const record = await db.contentProgress.getOneProgressByContentId(500, null)
    expect(record.data?.progress_percent).toBe(100)
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
  })

  test('defaults to SELF collection when null is passed', async () => {
    await contentStatusCompleted(500, null)
    const record = await db.contentProgress.getOneProgressByContentId(500, null)
    expect(record.data?.collection_type).toBe(COLLECTION_TYPE.SELF)
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
  })
})

// ─── contentStatusCompletedMany ───────────────────────────────────────────────

describe('contentStatusCompletedMany', () => {
  test('sets all ids to completed state in DB', async () => {
    await contentStatusCompletedMany([501, 502, 503])
    expect(await getProgressState(501)).toBe('completed')
    expect(await getProgressState(502)).toBe('completed')
    expect(await getProgressState(503)).toBe('completed')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status-many')
  })

  test('each record has progress_percent of 100', async () => {
    await contentStatusCompletedMany([501, 502])
    const r1 = await db.contentProgress.getOneProgressByContentId(501, null)
    const r2 = await db.contentProgress.getOneProgressByContentId(502, null)
    expect(r1.data?.progress_percent).toBe(100)
    expect(r2.data?.progress_percent).toBe(100)
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status-many')
  })
})

// ─── contentStatusStarted ─────────────────────────────────────────────────────

describe('contentStatusStarted', () => {
  test('sets state to started in DB', async () => {
    await contentStatusStarted(600)
    expect(await getProgressState(600)).toBe('started')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
  })

  test('sets progress_percent to 0 in DB', async () => {
    await contentStatusStarted(600)
    const record = await db.contentProgress.getOneProgressByContentId(600, null)
    expect(record.data?.progress_percent).toBe(0)
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
  })
})

// ─── contentStatusReset ───────────────────────────────────────────────────────

describe('contentStatusReset', () => {
  test('removes record from DB so getProgressState returns empty string', async () => {
    await contentStatusCompleted(700)
    expect(await getProgressState(700)).toBe('completed')
    await contentStatusReset(700)
    expect(await getProgressState(700)).toBe('')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
  })
})

// ─── saveContentProgress ──────────────────────────────────────────────────────

describe('saveContentProgress', () => {
  test('progress higher than existing writes new value', async () => {
    await db.contentProgress.recordProgress(800, null, 30, meta, undefined, { skipPush: true })
    const hierarchy = { metadata: { 800: meta }, parents: {}, children: {} }
    await saveContentProgress(800, collectionSelf, 60, null, { hierarchy, isOffline: true })
    const record = await db.contentProgress.getOneProgressByContentId(800, null)
    expect(record.data?.progress_percent).toBe(60)
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
  })

  test('progress lower than existing is filtered — DB value unchanged', async () => {
    await db.contentProgress.recordProgress(800, null, 70, meta, undefined, { skipPush: true })
    const hierarchy = { metadata: { 800: meta }, parents: {}, children: {} }
    await saveContentProgress(800, collectionSelf, 40, null, { hierarchy, isOffline: true })
    const record = await db.contentProgress.getOneProgressByContentId(800, null)
    expect(record.data?.progress_percent).toBe(70)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('progress equal to existing writes successfully', async () => {
    await db.contentProgress.recordProgress(800, null, 50, meta, undefined, { skipPush: true })
    const hierarchy = { metadata: { 800: meta }, parents: {}, children: {} }
    await saveContentProgress(800, collectionSelf, 50, null, { hierarchy, isOffline: true })
    const record = await db.contentProgress.getOneProgressByContentId(800, null)
    expect(record.data?.progress_percent).toBe(50)
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
  })
})

// ─── setStartedOrCompletedStatus ─────────────────────────────────────────────

describe('setStartedOrCompletedStatus', () => {
  test('completed=true writes state=completed to DB', async () => {
    await setStartedOrCompletedStatus(900, collectionSelf, true)
    expect(await getProgressState(900)).toBe('completed')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
  })

  test('completed=false writes state=started to DB', async () => {
    await setStartedOrCompletedStatus(900, collectionSelf, false)
    expect(await getProgressState(900)).toBe('started')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
  })

  test('skipBubbleTrickle=true still writes the main record', async () => {
    await setStartedOrCompletedStatus(900, collectionSelf, true, { skipBubbleTrickle: true })
    expect(await getProgressState(900)).toBe('completed')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
  })
})

// ─── setStartedOrCompletedStatusMany ─────────────────────────────────────────

describe('setStartedOrCompletedStatusMany', () => {
  test('isCompleted=true sets all ids to completed in DB', async () => {
    await setStartedOrCompletedStatusMany([1001, 1002, 1003], collectionSelf, true)
    expect(await getProgressState(1001)).toBe('completed')
    expect(await getProgressState(1002)).toBe('completed')
    expect(await getProgressState(1003)).toBe('completed')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status-many')
  })

  test('isCompleted=false sets all ids to started in DB', async () => {
    await setStartedOrCompletedStatusMany([1001, 1002], collectionSelf, false)
    expect(await getProgressState(1001)).toBe('started')
    expect(await getProgressState(1002)).toBe('started')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status-many')
  })
})

// ─── resetStatus ─────────────────────────────────────────────────────────────

describe('resetStatus', () => {
  test('removes record so getProgressState returns empty string', async () => {
    await db.contentProgress.recordProgress(1100, null, 80, meta, undefined, { skipPush: true })
    expect(await getProgressState(1100)).toBe('started')
    await resetStatus(1100, collectionSelf)
    expect(await getProgressState(1100)).toBe('')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
  })
})

// ─── trackProgress ────────────────────────────────────────────────────────────

describe('trackProgress', () => {
  test('50 of 200 seconds records progress ~25 to DB', async () => {
    const hierarchy = { metadata: { 100: meta }, parents: {}, children: {} }
    await trackProgress(100, collectionSelf, 50, 200, false, true, hierarchy)
    const record = await db.contentProgress.getOneProgressByContentId(100, null)
    expect(record.data?.progress_percent).toBe(25)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('0 seconds clamps to progress 1 in DB', async () => {
    const hierarchy = { metadata: { 100: meta }, parents: {}, children: {} }
    await trackProgress(100, collectionSelf, 0, 200, false, true, hierarchy)
    const record = await db.contentProgress.getOneProgressByContentId(100, null)
    expect(record.data?.progress_percent).toBe(1)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('full duration (200/200) clamps to 99 — never reaches 100 via track', async () => {
    const hierarchy = { metadata: { 100: meta }, parents: {}, children: {} }
    await trackProgress(100, collectionSelf, 200, 200, false, true, hierarchy)
    const record = await db.contentProgress.getOneProgressByContentId(100, null)
    expect(record.data?.progress_percent).toBe(99)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })
})

// ─── recordWatchSession ───────────────────────────────────────────────────────

describe('recordWatchSession', () => {
  const mockUserActivity = jest.requireMock('../../../src/services/userActivity')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('writes progress to DB and calls trackUserPractice', async () => {
    await recordWatchSession(234, null, 200, 100, 30)
    const record = await db.contentProgress.getOneProgressByContentId(234, null)
    expect(record.data?.progress_percent).toBe(50)
    expect(mockUserActivity.trackUserPractice).toHaveBeenCalledWith(234, 30, expect.any(Object))
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('normalizes string contentId to number in DB', async () => {
    await recordWatchSession('234' as any, null, 200, 100, 30)
    const record = await db.contentProgress.getOneProgressByContentId(234, null)
    expect(record.data?.content_id).toBe(234)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })
})

// ─── _recordWatchSession ──────────────────────────────────────────────────────

describe('_recordWatchSession', () => {
  const mockUserActivity = jest.requireMock('../../../src/services/userActivity')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('writes progress to DB and calls trackUserPractice', async () => {
    const hierarchy = { metadata: { 234: meta }, parents: {}, children: {} }
    await _recordWatchSession(234, 200, 100, 30, { collection: null, isOffline: true, hierarchy })
    const record = await db.contentProgress.getOneProgressByContentId(234, null)
    expect(record.data?.progress_percent).toBe(50)
    expect(mockUserActivity.trackUserPractice).toHaveBeenCalledWith(234, 30, expect.any(Object))
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })
})

// ─── flushWatchSession ────────────────────────────────────────────────────────

describe('flushWatchSession', () => {
  test('triggers push for both contentProgress and practices', async () => {
    await expect(flushWatchSession()).resolves.not.toThrow()
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('flush-watch-session')
    expect(ctx.pushSpies.practices).toHaveBeenCalledWith('flush-watch-session')
  })
})

// ─── E2E Scenarios ────────────────────────────────────────────────────────────

describe('Scenario: User completes lesson a-la-carte', () => {
  test('state=completed and progress_percent=100 written to DB', async () => {
    await contentStatusCompleted(42001)
    const record = await db.contentProgress.getOneProgressByContentId(42001, null)
    expect(record.data?.state).toBe('completed')
    expect(record.data?.progress_percent).toBe(100)
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
  })
})

describe('Scenario: User starts lesson a-la-carte', () => {
  test('state=started and progress_percent=0 written to DB', async () => {
    await contentStatusStarted(42002)
    const record = await db.contentProgress.getOneProgressByContentId(42002, null)
    expect(record.data?.state).toBe('started')
    expect(record.data?.progress_percent).toBe(0)
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
  })
})

describe('Scenario: User resets lesson progress', () => {
  test('record removed from DB after reset', async () => {
    await contentStatusCompleted(42003)
    expect(await getProgressState(42003)).toBe('completed')
    await contentStatusReset(42003)
    expect(await getProgressState(42003)).toBe('')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
  })
})

describe('Scenario: User watches video halfway through', () => {
  test('progress written and clamped correctly', async () => {
    await recordWatchSession(42004, null, 200, 100, 30)
    const record = await db.contentProgress.getOneProgressByContentId(42004, null)
    expect(record.data?.progress_percent).toBe(50)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })
})

describe('Scenario: User watches to end — clamped at 99 (not 100)', () => {
  test('progress_percent is 99, not 100, after watching to the end', async () => {
    await recordWatchSession(42005, null, 200, 200, 60)
    const record = await db.contentProgress.getOneProgressByContentId(42005, null)
    expect(record.data?.progress_percent).toBe(99)
    expect(record.data?.state).toBe('started')
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })
})

describe('Scenario: Completing multiple lessons at once', () => {
  test('all lessons written as completed to DB', async () => {
    await contentStatusCompletedMany([50001, 50002, 50003])
    expect(await getProgressState(50001)).toBe('completed')
    expect(await getProgressState(50002)).toBe('completed')
    expect(await getProgressState(50003)).toBe('completed')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status-many')
  })
})
