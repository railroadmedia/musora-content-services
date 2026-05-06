import { initializeTestDB } from '../initializeTestDB'
import {
  getProgressState, getProgressStateByIds, getProgressStateByRecordIds,
  getResumeTimeSecondsByIds, getResumeTimeSecondsByRecordIds,
  getById, getByIds, getByRecordIds,
  getLastInteractedOf, getProgressDataByIds, getProgressDataByRecordIds,
  getAllStarted, getAllCompleted, getAllCompletedByIds,
  getAllStartedOrCompleted, getStartedOrCompletedProgressOnly, _getAllStartedOrCompleted,
} from '@/services/contentProgress'
import db from '@/services/sync/repository-proxy'
jest.mock('../../../src/services/sanity.js', () => require('./__mocks__/mocks').mockSanity())
jest.mock('../../../src/services/content-org/learning-paths.ts', () => require('./__mocks__/mocks').mockLearningPaths())
jest.mock('../../../src/services/awards/internal/content-progress-observer', () => require('./__mocks__/mocks').mockContentProgressObserver())
jest.mock('../../../src/services/progress-events', () => require('./__mocks__/mocks').mockProgressEvents())

const meta = { brand: 'drumeo', type: 'lesson', parent_id: 0 }

initializeTestDB()

describe('getById', () => {
  test('returns field value when record found', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, 120, { skipPush: true })
    const result = await getById(100, null, 'state', '')
    expect(result).toBe('started')
  })

  test('returns defaultValue when record not found', async () => {
    const result = await getById(999, null, 'state', 'default-val')
    expect(result).toBe('default-val')
  })

  test('returns defaultValue when contentId is falsy', async () => {
    const result = await getById(0, null, 'state', 'fallback')
    expect(result).toBe('fallback')
  })
})

describe('getByIds', () => {
  test('returns Map with correct values for found ids', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    const result = await getByIds([100, 300], null, 'state', '')
    expect(result.get(100)).toBe('started')
    expect(result.get(300)).toBe('completed')
  })

  test('defaults to defaultValue for missing ids', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    const result = await getByIds([100, 999], null, 'state', '')
    expect(result.get(100)).toBe('started')
    expect(result.get(999)).toBe('')
  })

  test('returns empty Map for empty array', async () => {
    const result = await getByIds([], null, 'state', '')
    expect(result.size).toBe(0)
  })
})

describe('getByRecordIds', () => {
  test('returns object with correct values for found record ids', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    const result = await getByRecordIds(['100:self:0', '300:self:0'], 'state', '')
    expect(result['100:self:0']).toBe('started')
    expect(result['300:self:0']).toBe('completed')
  })

  test('defaults to defaultValue for missing record id', async () => {
    const result = await getByRecordIds(['999:self:0'], 'state', '')
    expect(result['999:self:0']).toBe('')
  })
})

describe('getProgressState', () => {
  test('returns started for started content', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    expect(await getProgressState(100)).toBe('started')
  })

  test('returns completed for completed content', async () => {
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    expect(await getProgressState(300)).toBe('completed')
  })

  test('returns empty string for unknown content', async () => {
    expect(await getProgressState(999)).toBe('')
  })
})

describe('getProgressStateByIds', () => {
  test('returns Map with correct states for multiple ids', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    const result = await getProgressStateByIds([100, 300])
    expect(result.get(100)).toBe('started')
    expect(result.get(300)).toBe('completed')
  })

  test('defaults to empty string for unknown ids', async () => {
    const result = await getProgressStateByIds([999])
    expect(result.get(999)).toBe('')
  })

  test('returns empty Map for empty array', async () => {
    const result = await getProgressStateByIds([])
    expect(result.size).toBe(0)
  })
})

describe('getProgressStateByRecordIds', () => {
  test('returns correct states by record id', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    const result = await getProgressStateByRecordIds(['100:self:0', '300:self:0'])
    expect(result['100:self:0']).toBe('started')
    expect(result['300:self:0']).toBe('completed')
  })

  test('returns empty string for unknown record id', async () => {
    const result = await getProgressStateByRecordIds(['999:self:0'])
    expect(result['999:self:0']).toBe('')
  })
})

describe('getResumeTimeSecondsByIds', () => {
  test('returns resume time when record has one', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, 120, { skipPush: true })
    const result = await getResumeTimeSecondsByIds([100])
    expect(result.get(100)).toBe(120)
  })

  test('returns 0 for unknown ids', async () => {
    const result = await getResumeTimeSecondsByIds([999])
    expect(result.get(999)).toBe(0)
  })
})

describe('getResumeTimeSecondsByRecordIds', () => {
  test('returns correct value by record id', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, 120, { skipPush: true })
    const result = await getResumeTimeSecondsByRecordIds(['100:self:0'])
    expect(result['100:self:0']).toBe(120)
  })

  test('returns 0 for unknown record id', async () => {
    const result = await getResumeTimeSecondsByRecordIds(['999:self:0'])
    expect(result['999:self:0']).toBe(0)
  })
})

describe('getProgressDataByIds', () => {
  test('returns correct shape for seeded content', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    const result = await getProgressDataByIds([100], null)
    expect(result[100].progress).toBe(20)
    expect(result[100].status).toBe('started')
    expect(typeof result[100].last_update).toBe('number')
  })

  test('returns defaults for unknown id', async () => {
    const result = await getProgressDataByIds([999], null)
    expect(result[999]).toEqual({ last_update: 0, progress: 0, status: '' })
  })

  test('normalizes string content ids', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    const result = await getProgressDataByIds(['100' as any], null)
    expect(result[100].progress).toBe(20)
  })
})

describe('getProgressDataByRecordIds', () => {
  test('returns correct shape for seeded content', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    const result = await getProgressDataByRecordIds(['100:self:0'])
    expect(result['100:self:0'].progress).toBe(20)
    expect(result['100:self:0'].status).toBe('started')
    expect(typeof result['100:self:0'].last_update).toBe('number')
  })

  test('returns defaults for unknown record id', async () => {
    const result = await getProgressDataByRecordIds(['999:self:0'])
    expect(result['999:self:0']).toEqual({ last_update: 0, progress: 0, status: '' })
  })
})

describe('getLastInteractedOf', () => {
  test('returns a content id from the given list when records exist', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(200, null, 50, meta, undefined, { skipPush: true })
    const result = await getLastInteractedOf([100, 200])
    expect([100, 200]).toContain(result)
  })

  test('returns undefined when no records match', async () => {
    const result = await getLastInteractedOf([999])
    expect(result).toBeUndefined()
  })
})

describe('getAllStarted', () => {
  test('returns started content ids, not completed', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    const result = await getAllStarted()
    expect(result).toContain(100)
    expect(result).not.toContain(300)
  })

  test('returns empty array when no started content', async () => {
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    expect(await getAllStarted()).toHaveLength(0)
  })

  test('respects limit', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(200, null, 50, meta, undefined, { skipPush: true })
    expect(await getAllStarted(1)).toHaveLength(1)
  })

  test('onlyIds=false returns objects with content_id', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    const result = await getAllStarted(null, { onlyIds: false })
    expect(result[0]).toHaveProperty('content_id', 100)
  })
})

describe('getAllCompleted', () => {
  test('returns completed content ids, not started', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    const result = await getAllCompleted()
    expect(result).toContain(300)
    expect(result).not.toContain(100)
  })

  test('returns empty array when no completed content', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    expect(await getAllCompleted()).toHaveLength(0)
  })

  test('respects limit', async () => {
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(400, null, 100, meta, undefined, { skipPush: true })
    expect(await getAllCompleted(1)).toHaveLength(1)
  })
})

describe('getAllCompletedByIds', () => {
  test('returns only completed records within given ids', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(400, null, 100, meta, undefined, { skipPush: true })
    const result = await getAllCompletedByIds([100, 300, 400])
    const completedIds = result.data.map((r: any) => r.content_id)
    expect(completedIds).toContain(300)
    expect(completedIds).toContain(400)
    expect(completedIds).not.toContain(100)
  })

  test('returns empty data array when no completed records match', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    const result = await getAllCompletedByIds([100])
    expect(result.data).toHaveLength(0)
  })
})

describe('getAllStartedOrCompleted', () => {
  test('returns ids for both started and completed records', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    const result = await getAllStartedOrCompleted()
    expect(result).toContain(100)
    expect(result).toContain(300)
  })

  test('respects limit', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(400, null, 100, meta, undefined, { skipPush: true })
    const result = await getAllStartedOrCompleted({ limit: 2 })
    expect(result).toHaveLength(2)
  })

  test('onlyIds=false returns full record objects', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    const result = await getAllStartedOrCompleted({ onlyIds: false })
    expect(result[0]).toHaveProperty('content_id')
    expect(result[0]).toHaveProperty('state')
    expect(result[0]).toHaveProperty('progress_percent')
  })
})

describe('_getAllStartedOrCompleted', () => {
  test('returns all started and completed records', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    const result = await _getAllStartedOrCompleted()
    const ids = result.map((r: any) => r.content_id)
    expect(ids).toContain(100)
    expect(ids).toContain(300)
  })

  test('respects limit', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(400, null, 100, meta, undefined, { skipPush: true })
    const result = await _getAllStartedOrCompleted({ limit: 2 })
    expect(result).toHaveLength(2)
  })
})

describe('getStartedOrCompletedProgressOnly', () => {
  test('returns map of content_id to progress_percent', async () => {
    await db.contentProgress.recordProgress(100, null, 20, meta, undefined, { skipPush: true })
    await db.contentProgress.recordProgress(300, null, 100, meta, undefined, { skipPush: true })
    const result = await getStartedOrCompletedProgressOnly()
    expect(result[100]).toBe(20)
    expect(result[300]).toBe(100)
  })
})
