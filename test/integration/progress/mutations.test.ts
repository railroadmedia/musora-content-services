import { initializeTestDB } from '../initializeTestDB'
import { Progress } from '../../../src/services/progress'
import {
  COLLECTION_ID_SELF,
  COLLECTION_TYPE,
} from '../../../src/services/sync/models/ContentProgress'
import db from '../../../src/services/sync/repository-proxy'

jest.mock('../../../src/services/sanity.js', () =>
  require('../content-progress/__mocks__/mocks').mockSanity()
)
jest.mock('../../../src/services/content-org/learning-paths.ts', () =>
  require('../content-progress/__mocks__/mocks').mockLearningPaths()
)
jest.mock('../../../src/services/awards/internal/content-progress-observer', () =>
  require('../content-progress/__mocks__/mocks').mockContentProgressObserver()
)
jest.mock('../../../src/services/progress-events', () =>
  require('../content-progress/__mocks__/mocks').mockProgressEvents()
)

const meta = { brand: 'drumeo', type: 'lesson', parent_id: 0 }
const collectionSelf = { type: COLLECTION_TYPE.SELF, id: COLLECTION_ID_SELF }

const ctx = initializeTestDB()

describe('Progress.markCompleted', () => {
  test('sets state to completed', async () => {
    await Progress.markCompleted(500)
    expect(await Progress.state(500)).toBe('completed')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
  })

  test('sets progress_percent to 100', async () => {
    await Progress.markCompleted(500)
    const record = await db.contentProgress.getOneProgressByContentId(500, null)
    expect(record.data?.progress_percent).toBe(100)
  })

  test('defaults to SELF when collection omitted', async () => {
    await Progress.markCompleted(500)
    const record = await db.contentProgress.getOneProgressByContentId(500, null)
    expect(record.data?.collection_type).toBe(COLLECTION_TYPE.SELF)
  })
})

describe('Progress.markCompletedMany', () => {
  test('sets all ids to completed', async () => {
    await Progress.markCompletedMany([501, 502, 503])
    expect(await Progress.state(501)).toBe('completed')
    expect(await Progress.state(502)).toBe('completed')
    expect(await Progress.state(503)).toBe('completed')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith(
      'set-started-or-completed-status-many'
    )
  })

  test('each record has progress_percent of 100', async () => {
    await Progress.markCompletedMany([501, 502])
    const r1 = await db.contentProgress.getOneProgressByContentId(501, null)
    const r2 = await db.contentProgress.getOneProgressByContentId(502, null)
    expect(r1.data?.progress_percent).toBe(100)
    expect(r2.data?.progress_percent).toBe(100)
  })
})

describe('Progress.markStarted', () => {
  test('sets state to started', async () => {
    await Progress.markStarted(600)
    expect(await Progress.state(600)).toBe('started')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
  })

  test('sets progress_percent to 0', async () => {
    await Progress.markStarted(600)
    const record = await db.contentProgress.getOneProgressByContentId(600, null)
    expect(record.data?.progress_percent).toBe(0)
  })
})

describe('Progress.reset', () => {
  test('removes record so state returns empty string', async () => {
    await Progress.markCompleted(700)
    expect(await Progress.state(700)).toBe('completed')
    await Progress.reset(700)
    expect(await Progress.state(700)).toBe('')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('reset-status')
  })
})

describe('Progress.save', () => {
  test('progress higher than existing writes new value', async () => {
    await db.contentProgress.recordProgress(800, null, 30, meta, undefined, { skipPush: true })
    const hierarchy = { metadata: { 800: meta }, parents: {}, children: {} }
    await Progress.save(800, 60, collectionSelf, undefined, { hierarchy, isOffline: true })
    const record = await db.contentProgress.getOneProgressByContentId(800, null)
    expect(record.data?.progress_percent).toBe(60)
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
  })

  test('progress lower than existing is filtered — DB value unchanged', async () => {
    await db.contentProgress.recordProgress(800, null, 70, meta, undefined, { skipPush: true })
    const hierarchy = { metadata: { 800: meta }, parents: {}, children: {} }
    await Progress.save(800, 40, collectionSelf, undefined, { hierarchy, isOffline: true })
    const record = await db.contentProgress.getOneProgressByContentId(800, null)
    expect(record.data?.progress_percent).toBe(70)
    expect(ctx.pushSpies.contentProgress).not.toHaveBeenCalled()
  })

  test('progress equal to existing writes successfully', async () => {
    await db.contentProgress.recordProgress(800, null, 50, meta, undefined, { skipPush: true })
    const hierarchy = { metadata: { 800: meta }, parents: {}, children: {} }
    await Progress.save(800, 50, collectionSelf, undefined, { hierarchy, isOffline: true })
    const record = await db.contentProgress.getOneProgressByContentId(800, null)
    expect(record.data?.progress_percent).toBe(50)
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('save-content-progress')
  })
})

describe('Progress.setStatus', () => {
  test('isCompleted=true writes state=completed', async () => {
    await Progress.setStatus(900, true, collectionSelf)
    expect(await Progress.state(900)).toBe('completed')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith('set-started-or-completed-status')
  })

  test('isCompleted=false writes state=started', async () => {
    await Progress.setStatus(900, false, collectionSelf)
    expect(await Progress.state(900)).toBe('started')
  })

  test('skipBubbleTrickle=true still writes the main record', async () => {
    await Progress.setStatus(900, true, collectionSelf, { skipBubbleTrickle: true })
    expect(await Progress.state(900)).toBe('completed')
  })
})

describe('Progress.setStatusMany', () => {
  test('isCompleted=true sets all ids to completed', async () => {
    await Progress.setStatusMany([1001, 1002, 1003], true, collectionSelf)
    expect(await Progress.state(1001)).toBe('completed')
    expect(await Progress.state(1002)).toBe('completed')
    expect(await Progress.state(1003)).toBe('completed')
    expect(ctx.pushSpies.contentProgress).toHaveBeenCalledWith(
      'set-started-or-completed-status-many'
    )
  })

  test('isCompleted=false sets all ids to started', async () => {
    await Progress.setStatusMany([1001, 1002], false, collectionSelf)
    expect(await Progress.state(1001)).toBe('started')
    expect(await Progress.state(1002)).toBe('started')
  })
})

describe('Scenario: User completes lesson a-la-carte', () => {
  test('state=completed and progress_percent=100', async () => {
    await Progress.markCompleted(42001)
    const record = await db.contentProgress.getOneProgressByContentId(42001, null)
    expect(record.data?.state).toBe('completed')
    expect(record.data?.progress_percent).toBe(100)
  })
})

describe('Scenario: User starts lesson a-la-carte', () => {
  test('state=started and progress_percent=0', async () => {
    await Progress.markStarted(42002)
    const record = await db.contentProgress.getOneProgressByContentId(42002, null)
    expect(record.data?.state).toBe('started')
    expect(record.data?.progress_percent).toBe(0)
  })
})

describe('Scenario: User resets lesson progress', () => {
  test('record removed after reset', async () => {
    await Progress.markCompleted(42003)
    expect(await Progress.state(42003)).toBe('completed')
    await Progress.reset(42003)
    expect(await Progress.state(42003)).toBe('')
  })
})

describe('Scenario: Completing multiple lessons at once', () => {
  test('all lessons written as completed', async () => {
    await Progress.markCompletedMany([50001, 50002, 50003])
    expect(await Progress.state(50001)).toBe('completed')
    expect(await Progress.state(50002)).toBe('completed')
    expect(await Progress.state(50003)).toBe('completed')
  })
})
