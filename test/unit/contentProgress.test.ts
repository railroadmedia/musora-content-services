import { initializeTestService } from '../initializeTests.js'
import {
  computeBubbleTrickleProgresses,
  duplicateProgressToALaCarte,
  extractFromRecordId,
  generateRecordId,
  getAllCompleted,
  getAllCompletedByIds,
  getAllStarted,
  getAllStartedOrCompleted,
  getIdsWhereLastAccessedFromMethod,
  getLastInteractedOf,
  getNavigateTo,
  getProgressDataByIds,
  getProgressDataByRecordIds,
  getProgressState,
  getProgressStateByIds,
  getProgressStateByRecordIds,
  getResumeTimeSecondsByIds,
  getResumeTimeSecondsByRecordIds,
  getStartedOrCompletedProgressOnly,
  normalizeCollection,
  normalizeContentId,
  normalizeContentIds,
} from '@/services/contentProgress'
import { COLLECTION_ID_SELF, COLLECTION_TYPE } from '@/services/sync/models/ContentProgress'

type ProgressRecord = {
  content_id: number
  state: string
  progress_percent: number
  updated_at: number
  resume_time_seconds?: number
  last_interacted_a_la_carte?: number
}

type RecordIdProgress = {
  id: string
  content_id: number
  state: string
  progress_percent: number
  updated_at: number
  resume_time_seconds?: number
}

let mockProgressRecords: ProgressRecord[] = []
let mockRecordProgressData: RecordIdProgress[] = []
let mockLastInteracted: number | null = null
let mockMethodAccessedIds: number[] = []

jest.mock('../../src/services/sync/repository-proxy', () => {
  const mockFns = {
    contentProgress: {
      getOneProgressByContentId: jest.fn().mockImplementation((contentId) => {
        const record = mockProgressRecords.find(r => r.content_id === contentId)
        return Promise.resolve({ data: record || null })
      }),
      getSomeProgressByContentIds: jest.fn().mockImplementation((contentIds) => {
        const records = mockProgressRecords.filter(r => contentIds.includes(r.content_id))
        return Promise.resolve({ data: records })
      }),
      getSomeProgressByRecordIds: jest.fn().mockImplementation((ids) => {
        const records = mockRecordProgressData.filter(r => ids.includes(r.id))
        return Promise.resolve({ data: records })
      }),
      mostRecentlyUpdatedId: jest.fn().mockImplementation(() => {
        return Promise.resolve({ data: mockLastInteracted })
      }),
      started: jest.fn().mockImplementation((limit, opts) => {
        const startedIds = mockProgressRecords
          .filter(r => r.state === 'started')
          .sort((a, b) => b.updated_at - a.updated_at)
          .map(r => r.content_id)
        const result = limit ? startedIds.slice(0, limit) : startedIds
        return Promise.resolve(opts?.onlyIds !== false ? result : result.map(id => ({ content_id: id })))
      }),
      completed: jest.fn().mockImplementation((limit, opts) => {
        const completedIds = mockProgressRecords
          .filter(r => r.state === 'completed')
          .sort((a, b) => b.updated_at - a.updated_at)
          .map(r => r.content_id)
        const result = limit ? completedIds.slice(0, limit) : completedIds
        return Promise.resolve(opts?.onlyIds !== false ? result : result.map(id => ({ content_id: id })))
      }),
      completedByContentIds: jest.fn().mockImplementation((contentIds) => {
        return mockProgressRecords
          .filter(r => r.state === 'completed' && contentIds.includes(r.content_id))
          .map(r => r.content_id)
      }),
      startedOrCompleted: jest.fn().mockImplementation(() => {
        const records = mockProgressRecords
          .filter(r => r.state === 'started' || r.state === 'completed')
          .sort((a, b) => b.updated_at - a.updated_at)
        return Promise.resolve({ data: records })
      }),
      getSomeProgressWhereLastAccessedFromMethod: jest.fn().mockImplementation((contentIds) => {
        const records = mockMethodAccessedIds
          .filter(id => contentIds.includes(id))
          .map(id => ({ content_id: id }))
        return Promise.resolve({ data: records })
      }),
      recordProgress: jest.fn().mockResolvedValue({ data: null }),
      recordProgressMany: jest.fn().mockResolvedValue({ data: null }),
      requestPushUnsynced: jest.fn(),
      eraseProgress: jest.fn().mockResolvedValue({ data: null }),
      eraseProgressMany: jest.fn().mockResolvedValue({ data: null }),
    },
    practices: {
      queryAll: jest.fn().mockResolvedValue({ data: [] }),
      getAll: jest.fn().mockResolvedValue({ data: [] }),
    },
  }
  return { default: mockFns, ...mockFns }
})

jest.mock('../../src/services/sanity.js', () => ({
  getHierarchy: jest.fn().mockResolvedValue({ metadata: {}, parents: {}, children: {} }),
  getHierarchies: jest.fn().mockResolvedValue({ metadata: {}, parents: {}, children: {} }),
  getSanityDate: jest.fn((date: Date) => date.toISOString()),
}))

const flushPromises = () => new Promise(resolve => setImmediate(resolve))
const mockRepo = jest.requireMock('../../src/services/sync/repository-proxy')

const collectionSelf = { type: COLLECTION_TYPE.SELF, id: COLLECTION_ID_SELF }
const collectionLP = (id: number) => ({ type: COLLECTION_TYPE.LEARNING_PATH, id })

// ─── filterOutLearningPathsForDuplication ─────────────────────────────────────

describe('filterOutLearningPathsForDuplication', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
    mockRepo.contentProgress.recordProgress.mockClear()
  })

  test('non-LP collection — all entries pass through', async () => {
    await duplicateProgressToALaCarte({ 101: 30, 102: 50 }, collectionSelf, { skipPush: true })
    await flushPromises()
    expect(mockRepo.contentProgress.recordProgress).toHaveBeenCalledTimes(2)
  })

  test('LP collection — excludes entry whose id matches collection id', async () => {
    await duplicateProgressToALaCarte({ 200: 50, 101: 30 }, collectionLP(200), { skipPush: true })
    await flushPromises()
    expect(mockRepo.contentProgress.recordProgress).toHaveBeenCalledTimes(1)
    expect(mockRepo.contentProgress.recordProgress.mock.calls[0][0]).toBe(101)
  })

  test('LP collection — non-LP entries still pass', async () => {
    await duplicateProgressToALaCarte({ 200: 50, 101: 30, 102: 60 }, collectionLP(200), { skipPush: true })
    await flushPromises()
    expect(mockRepo.contentProgress.recordProgress).toHaveBeenCalledTimes(2)
  })
})

// ─── filterOutNegativeProgress (in duplicateProgressToALaCarte) ───────────────

describe('filterOutNegativeProgress (in duplicateProgressToALaCarte)', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
    mockRepo.contentProgress.recordProgress.mockClear()
  })

  test('new progress greater than existing — passes through', async () => {
    mockProgressRecords = [
      { content_id: 101, state: 'started', progress_percent: 30, updated_at: 1000 },
    ]
    await duplicateProgressToALaCarte({ 101: 60 }, collectionSelf, { skipPush: true })
    await flushPromises()
    expect(mockRepo.contentProgress.recordProgress).toHaveBeenCalledTimes(1)
  })

  test('new progress less than existing — filtered out', async () => {
    mockProgressRecords = [
      { content_id: 101, state: 'started', progress_percent: 70, updated_at: 1000 },
    ]
    await duplicateProgressToALaCarte({ 101: 50 }, collectionSelf, { skipPush: true })
    await flushPromises()
    expect(mockRepo.contentProgress.recordProgress).not.toHaveBeenCalled()
  })

  test('new progress equal to existing — passes through', async () => {
    mockProgressRecords = [
      { content_id: 101, state: 'started', progress_percent: 50, updated_at: 1000 },
    ]
    await duplicateProgressToALaCarte({ 101: 50 }, collectionSelf, { skipPush: true })
    await flushPromises()
    expect(mockRepo.contentProgress.recordProgress).toHaveBeenCalledTimes(1)
  })

  test('new progress is 0 with no existing — kept (0 is not less than 0)', async () => {
    await duplicateProgressToALaCarte({ 101: 0 }, collectionSelf, { skipPush: true })
    await flushPromises()
    expect(mockRepo.contentProgress.recordProgress).toHaveBeenCalledTimes(1)
  })

  test('no existing record — any positive progress passes', async () => {
    // mockProgressRecords empty → external progress defaults to 0
    await duplicateProgressToALaCarte({ 101: 1 }, collectionSelf, { skipPush: true })
    await flushPromises()
    expect(mockRepo.contentProgress.recordProgress).toHaveBeenCalledTimes(1)
  })

  test('mixed entries — only passes those greater than existing', async () => {
    mockProgressRecords = [
      { content_id: 101, state: 'started', progress_percent: 70, updated_at: 1000 },
      { content_id: 102, state: 'started', progress_percent: 20, updated_at: 1000 },
    ]
    // 101: 50 < 70 → filtered; 102: 80 > 20 → passes; 103: no existing, 40 > 0 → passes
    await duplicateProgressToALaCarte({ 101: 50, 102: 80, 103: 40 }, collectionSelf, { skipPush: true })
    await flushPromises()
    expect(mockRepo.contentProgress.recordProgress).toHaveBeenCalledTimes(2)
  })
})

// ─── duplicateProgressForIds (skip configuration) ─────────────────────────────

describe('duplicateProgressForIds', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
    mockRepo.contentProgress.requestPushUnsynced.mockClear()
  })

  test('single item, skipPush=false — push triggered once', async () => {
    await duplicateProgressToALaCarte({ 101: 50 }, collectionSelf, { skipPush: false })
    await flushPromises()
    expect(mockRepo.contentProgress.requestPushUnsynced).toHaveBeenCalledTimes(1)
  })

  test('single item, skipPush=true — push never triggered', async () => {
    await duplicateProgressToALaCarte({ 101: 50 }, collectionSelf, { skipPush: true })
    await flushPromises()
    expect(mockRepo.contentProgress.requestPushUnsynced).not.toHaveBeenCalled()
  })

  test('multiple items, skipPush=false — push triggered exactly once (last item only)', async () => {
    await duplicateProgressToALaCarte({ 101: 30, 102: 50, 103: 70 }, collectionSelf, { skipPush: false })
    await flushPromises()
    expect(mockRepo.contentProgress.requestPushUnsynced).toHaveBeenCalledTimes(1)
  })

  test('multiple items, skipPush=true — push never triggered', async () => {
    await duplicateProgressToALaCarte({ 101: 30, 102: 50, 103: 70 }, collectionSelf, { skipPush: true })
    await flushPromises()
    expect(mockRepo.contentProgress.requestPushUnsynced).not.toHaveBeenCalled()
  })
})

// ─── pure functions ───────────────────────────────────────────────────────────

describe('normalizeContentId', () => {
  test('keeps number as-is', () => {
    expect(normalizeContentId(123)).toBe(123)
  })

  test('converts numeric string to number', () => {
    expect(normalizeContentId('123')).toBe(123)
  })

  test('converts "0" to 0', () => {
    expect(normalizeContentId('0')).toBe(0)
  })

  test('throws on non-numeric string', () => {
    expect(() => normalizeContentId('abc')).toThrow('Invalid content id: abc')
  })
})

describe('normalizeContentIds', () => {
  test('converts mixed array to numbers', () => {
    expect(normalizeContentIds([1, '2', 3])).toEqual([1, 2, 3])
  })

  test('returns empty array for empty input', () => {
    expect(normalizeContentIds([])).toEqual([])
  })
})

describe('normalizeCollection', () => {
  test('returns null for null', () => {
    expect(normalizeCollection(null)).toBeNull()
  })

  test('returns null for undefined', () => {
    expect(normalizeCollection(undefined)).toBeNull()
  })

  test('passes through valid collection with numeric id', () => {
    expect(normalizeCollection({ type: COLLECTION_TYPE.SELF, id: 123 })).toEqual({ type: 'self', id: 123 })
  })

  test('converts string id to number', () => {
    expect(normalizeCollection({ type: COLLECTION_TYPE.LEARNING_PATH, id: '456' as any })).toEqual({ type: 'learning-path-v2', id: 456 })
  })

  test('throws on invalid collection type', () => {
    expect(() => normalizeCollection({ type: 'invalid' as any, id: 1 })).toThrow('Invalid collection type: invalid')
  })

  test('throws on non-numeric string id', () => {
    expect(() => normalizeCollection({ type: COLLECTION_TYPE.SELF, id: 'abc' as any })).toThrow('Invalid collection id: abc')
  })
})

describe('generateRecordId', () => {
  test('returns null for falsy contentId', () => {
    expect(generateRecordId(0, null)).toBeNull()
  })

  test('generates id with null collection using self defaults', () => {
    expect(generateRecordId(123, null)).toBe(`123:${COLLECTION_TYPE.SELF}:${COLLECTION_ID_SELF}`)
  })

  test('generates id with learning-path collection', () => {
    expect(generateRecordId(123, { type: COLLECTION_TYPE.LEARNING_PATH, id: 456 })).toBe('123:learning-path-v2:456')
  })

  test('accepts string contentId', () => {
    expect(generateRecordId('123' as any, null)).toBe(`123:${COLLECTION_TYPE.SELF}:${COLLECTION_ID_SELF}`)
  })
})

describe('extractFromRecordId', () => {
  test('returns null for null input', () => {
    expect(extractFromRecordId(null)).toBeNull()
  })

  test('parses self collection record id', () => {
    expect(extractFromRecordId('123:self:0')).toEqual({
      contentId: 123,
      collection: { type: 'self', id: 0 },
    })
  })

  test('parses learning-path record id', () => {
    expect(extractFromRecordId('456:learning-path-v2:789')).toEqual({
      contentId: 456,
      collection: { type: 'learning-path-v2', id: 789 },
    })
  })
})

// ─── progress getters ─────────────────────────────────────────────────────────

describe('getProgressStateByIds', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = [
      { content_id: 101, state: 'started',   progress_percent: 50,  updated_at: 1000 },
      { content_id: 102, state: 'completed', progress_percent: 100, updated_at: 2000 },
    ]
  })

  test('returns Map with state for each known id', async () => {
    const result = await getProgressStateByIds([101, 102])
    expect(result.get(101)).toBe('started')
    expect(result.get(102)).toBe('completed')
  })

  test('defaults unknown id to empty string', async () => {
    const result = await getProgressStateByIds([101, 999])
    expect(result.get(999)).toBe('')
  })

  test('returns empty Map for empty input', async () => {
    const result = await getProgressStateByIds([])
    expect(result.size).toBe(0)
  })
})

describe('getProgressStateByRecordIds', () => {
  beforeEach(() => {
    initializeTestService()
    mockRecordProgressData = [
      { id: '101:self:0', content_id: 101, state: 'started',   progress_percent: 50,  updated_at: 1000 },
      { id: '102:self:0', content_id: 102, state: 'completed', progress_percent: 100, updated_at: 2000 },
    ]
  })

  test('returns object with state for each known record id', async () => {
    const result = await getProgressStateByRecordIds(['101:self:0', '102:self:0'])
    expect(result['101:self:0']).toBe('started')
    expect(result['102:self:0']).toBe('completed')
  })

  test('defaults unknown record id to empty string', async () => {
    const result = await getProgressStateByRecordIds(['101:self:0', 'unknown:self:0'])
    expect(result['unknown:self:0']).toBe('')
  })
})

describe('getResumeTimeSecondsByIds', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = [
      { content_id: 101, state: 'started', progress_percent: 50, updated_at: 1000, resume_time_seconds: 120 },
      { content_id: 102, state: 'started', progress_percent: 20, updated_at: 2000, resume_time_seconds: 45 },
    ]
  })

  test('returns Map with resume time for each known id', async () => {
    const result = await getResumeTimeSecondsByIds([101, 102])
    expect(result.get(101)).toBe(120)
    expect(result.get(102)).toBe(45)
  })

  test('defaults unknown id to 0', async () => {
    const result = await getResumeTimeSecondsByIds([101, 999])
    expect(result.get(999)).toBe(0)
  })
})

describe('getResumeTimeSecondsByRecordIds', () => {
  beforeEach(() => {
    initializeTestService()
    mockRecordProgressData = [
      { id: '101:self:0', content_id: 101, state: 'started', progress_percent: 50, updated_at: 1000, resume_time_seconds: 300 },
    ]
  })

  test('returns object with resume time for known record id', async () => {
    const result = await getResumeTimeSecondsByRecordIds(['101:self:0'])
    expect(result['101:self:0']).toBe(300)
  })

  test('defaults unknown record id to 0', async () => {
    const result = await getResumeTimeSecondsByRecordIds(['101:self:0', 'missing:self:0'])
    expect(result['missing:self:0']).toBe(0)
  })
})

describe('getLastInteractedOf', () => {
  beforeEach(() => {
    initializeTestService()
    mockLastInteracted = null
  })

  test('returns the most recently updated id', async () => {
    mockLastInteracted = 102
    const result = await getLastInteractedOf([101, 102, 103])
    expect(result).toBe(102)
  })

  test('returns undefined when no record found', async () => {
    mockLastInteracted = null
    const result = await getLastInteractedOf([101, 102])
    expect(result).toBeUndefined()
  })
})

describe('getProgressDataByIds', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = [
      { content_id: 101, state: 'started', progress_percent: 60, updated_at: 1000, last_interacted_a_la_carte: 1000 },
      { content_id: 102, state: 'completed', progress_percent: 100, updated_at: 2000, last_interacted_a_la_carte: 2000 },
    ]
  })

  test('returns progress data for known ids', async () => {
    const result = await getProgressDataByIds([101, 102], null)
    expect(result[101]).toEqual({ last_update: 1000, progress: 60, status: 'started' })
    expect(result[102]).toEqual({ last_update: 2000, progress: 100, status: 'completed' })
  })

  test('returns zero-defaults for unknown ids', async () => {
    const result = await getProgressDataByIds([101, 999], null)
    expect(result[999]).toEqual({ last_update: 0, progress: 0, status: '' })
  })

  test('includes all requested ids in result even when not in db', async () => {
    const result = await getProgressDataByIds([101, 200, 300], null)
    expect(Object.keys(result)).toHaveLength(3)
  })
})

describe('getProgressDataByRecordIds', () => {
  beforeEach(() => {
    initializeTestService()
    mockRecordProgressData = [
      { id: '101:self:0', content_id: 101, state: 'started', progress_percent: 55, updated_at: 5000 },
    ]
  })

  test('returns progress data keyed by record id', async () => {
    const result = await getProgressDataByRecordIds(['101:self:0'])
    expect(result['101:self:0']).toEqual({ last_update: 5000, progress: 55, status: 'started' })
  })

  test('returns zero-defaults for unknown record ids', async () => {
    const result = await getProgressDataByRecordIds(['101:self:0', 'missing:self:0'])
    expect(result['missing:self:0']).toEqual({ last_update: 0, progress: 0, status: '' })
  })
})

describe('getAllCompleted', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = [
      { content_id: 101, state: 'completed', progress_percent: 100, updated_at: 3000 },
      { content_id: 102, state: 'started',   progress_percent: 50,  updated_at: 2000 },
      { content_id: 103, state: 'completed', progress_percent: 100, updated_at: 1000 },
    ]
  })

  test('returns all completed ids sorted by most recent', async () => {
    const result = await getAllCompleted()
    expect(result).toEqual([101, 103])
  })

  test('respects limit', async () => {
    const result = await getAllCompleted(1)
    expect(result).toEqual([101])
  })
})

describe('getAllCompletedByIds', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = [
      { content_id: 101, state: 'completed', progress_percent: 100, updated_at: 1000 },
      { content_id: 102, state: 'started',   progress_percent: 50,  updated_at: 2000 },
      { content_id: 103, state: 'completed', progress_percent: 100, updated_at: 3000 },
    ]
  })

  test('returns completed ids from the given set', async () => {
    const result = await getAllCompletedByIds([101, 102, 103])
    expect(result).toEqual(expect.arrayContaining([101, 103]))
    expect(result).not.toContain(102)
  })

  test('returns empty array when no matches', async () => {
    const result = await getAllCompletedByIds([999, 998])
    expect(result).toEqual([])
  })
})

describe('getStartedOrCompletedProgressOnly', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = [
      { content_id: 101, state: 'started',   progress_percent: 42, updated_at: 1000 },
      { content_id: 102, state: 'completed', progress_percent: 100, updated_at: 2000 },
    ]
  })

  test('returns map of content_id to progress_percent', async () => {
    const result = await getStartedOrCompletedProgressOnly()
    expect(result).toEqual({ 101: 42, 102: 100 })
  })
})

describe('getIdsWhereLastAccessedFromMethod', () => {
  beforeEach(() => {
    initializeTestService()
    mockMethodAccessedIds = [101, 103]
  })

  test('returns ids that were accessed from method', async () => {
    const result = await getIdsWhereLastAccessedFromMethod([101, 102, 103])
    expect(result).toEqual(expect.arrayContaining([101, 103]))
    expect(result).not.toContain(102)
  })

  test('returns empty array when none match', async () => {
    const result = await getIdsWhereLastAccessedFromMethod([999, 998])
    expect(result).toEqual([])
  })
})

// ─── bubble/trickle ───────────────────────────────────────────────────────────

const testHierarchy = {
  parents: { 101: 200, 102: 200, 200: 300 } as Record<number, number>,
  children: { 300: [200], 200: [101, 102], 101: [], 102: [] } as Record<number, number[]>,
  metadata: {} as Record<number, any>,
}

describe('computeBubbleTrickleProgresses', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  describe('trickle', () => {
    test('applies progress to direct children', async () => {
      const result = await computeBubbleTrickleProgresses(200, 50, null, testHierarchy, { bubble: false })
      expect(result).toEqual({ 101: 50, 102: 50 })
    })

    test('applies progress to grandchildren', async () => {
      const deep = {
        ...testHierarchy,
        children: { ...testHierarchy.children, 101: [1001], 1001: [] },
        parents: { ...testHierarchy.parents, 1001: 101 },
      }
      const result = await computeBubbleTrickleProgresses(200, 75, null, deep, { bubble: false })
      expect(result).toEqual({ 101: 75, 102: 75, 1001: 75 })
    })

    test('returns empty object for leaf node', async () => {
      const result = await computeBubbleTrickleProgresses(101, 50, null, testHierarchy, { bubble: false })
      expect(result).toEqual({})
    })

    test('traverses all descendants regardless of depth param', async () => {
      const chain = {
        parents: { 2: 1, 3: 2, 4: 3, 5: 4 } as Record<number, number>,
        children: { 1: [2], 2: [3], 3: [4], 4: [5], 5: [] } as Record<number, number[]>,
        metadata: {},
      }
      const result = await computeBubbleTrickleProgresses(1, 50, null, chain, { bubble: false })
      expect(result).toEqual({ 2: 50, 3: 50, 4: 50, 5: 50 })
    })

    test('missing children key treated as empty — no crash', async () => {
      const sparse = {
        parents: { 101: 200 } as Record<number, number>,
        children: { 200: [101] } as Record<number, number[]>,
        metadata: {},
      }
      const result = await computeBubbleTrickleProgresses(200, 40, null, sparse, { bubble: false })
      expect(result).toEqual({ 101: 40 })
    })

    test('collection param has no effect on output', async () => {
      const withCol = await computeBubbleTrickleProgresses(200, 50, { type: COLLECTION_TYPE.SELF, id: 0 }, testHierarchy, { bubble: false })
      const withoutCol = await computeBubbleTrickleProgresses(200, 50, null, testHierarchy, { bubble: false })
      expect(withCol).toEqual(withoutCol)
    })
  })

  describe('bubble', () => {
    test('averages sibling progress into parent', async () => {
      mockProgressRecords = [
        { content_id: 101, state: 'started', progress_percent: 60, updated_at: 1000 },
        { content_id: 102, state: 'started', progress_percent: 40, updated_at: 1000 },
      ]
      const result = await computeBubbleTrickleProgresses(101, 60, null, testHierarchy, { trickle: false })
      expect(result[200]).toBe(50)
    })

    test('bubbles zero to grandparent when parent has no stored progress', async () => {
      mockProgressRecords = [
        { content_id: 101, state: 'started', progress_percent: 60, updated_at: 1000 },
        { content_id: 102, state: 'started', progress_percent: 40, updated_at: 1000 },
      ]
      const result = await computeBubbleTrickleProgresses(101, 60, null, testHierarchy, { trickle: false })
      expect(result[300]).toBe(0)
    })
  })
})

// ─── getAncestorAndSiblingIds ─────────────────────────────────────────────────

describe('getAncestorAndSiblingIds', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('no parent — bubble returns empty', async () => {
    const flat = {
      parents: {} as Record<number, number>,
      children: { 200: [101, 102] } as Record<number, number[]>,
      metadata: {},
    }
    const result = await computeBubbleTrickleProgresses(200, 50, null, flat, { trickle: false })
    expect(result).toEqual({})
  })

  test('stops ascending at MAX_DEPTH (3 levels) — 4th ancestor absent from result', async () => {
    const deep = {
      parents: { 101: 200, 200: 300, 300: 400, 400: 500 } as Record<number, number>,
      children: { 500: [400], 400: [300], 300: [200], 200: [101], 101: [] } as Record<number, number[]>,
      metadata: {},
    }
    const result = await computeBubbleTrickleProgresses(101, 50, null, deep, { trickle: false })
    expect(result).toHaveProperty('200')
    expect(result).toHaveProperty('300')
    expect(result).toHaveProperty('400')
    expect(result).not.toHaveProperty('500')
  })

  test('circular parent — no crash, resolves', async () => {
    const circular = {
      parents: { 101: 101 } as Record<number, number>,
      children: { 101: [] } as Record<number, number[]>,
      metadata: {},
    }
    await expect(
      computeBubbleTrickleProgresses(101, 50, null, circular, { trickle: false })
    ).resolves.toBeDefined()
  })
})

// ─── averageProgressesFor ─────────────────────────────────────────────────────

describe('averageProgressesFor', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('no parent — returns empty', async () => {
    const flat = {
      parents: {} as Record<number, number>,
      children: { 200: [101] } as Record<number, number[]>,
      metadata: {},
    }
    const result = await computeBubbleTrickleProgresses(200, 50, null, flat, { trickle: false })
    expect(result).toEqual({})
  })

  test('single child: parent avg equals child progress', async () => {
    const single = {
      parents: { 101: 200 } as Record<number, number>,
      children: { 200: [101], 101: [] } as Record<number, number[]>,
      metadata: {},
    }
    mockProgressRecords = [
      { content_id: 101, state: 'started', progress_percent: 64, updated_at: 1000 },
    ]
    const result = await computeBubbleTrickleProgresses(101, 64, null, single, { trickle: false })
    expect(result[200]).toBe(64)
  })

  test('two children: averages correctly', async () => {
    mockProgressRecords = [
      { content_id: 101, state: 'started', progress_percent: 30, updated_at: 1000 },
      { content_id: 102, state: 'started', progress_percent: 70, updated_at: 1000 },
    ]
    const result = await computeBubbleTrickleProgresses(101, 30, null, testHierarchy, { trickle: false })
    expect(result[200]).toBe(50)
  })

  test('rounds fractional average with Math.round', async () => {
    const threeChild = {
      parents: { 101: 200, 102: 200, 103: 200 } as Record<number, number>,
      children: { 200: [101, 102, 103], 101: [], 102: [], 103: [] } as Record<number, number[]>,
      metadata: {},
    }
    mockProgressRecords = [
      { content_id: 101, state: 'started', progress_percent: 10, updated_at: 1000 },
      { content_id: 102, state: 'started', progress_percent: 20, updated_at: 1000 },
      { content_id: 103, state: 'started', progress_percent: 31, updated_at: 1000 },
    ]
    const result = await computeBubbleTrickleProgresses(101, 10, null, threeChild, { trickle: false })
    // (10 + 20 + 31) / 3 = 20.33 → Math.round → 20
    expect(result[200]).toBe(20)
  })

  test('untracked sibling defaults to 0 in average', async () => {
    mockProgressRecords = [
      { content_id: 101, state: 'started', progress_percent: 80, updated_at: 1000 },
      // 102 has no record — defaults to 0
    ]
    const result = await computeBubbleTrickleProgresses(101, 80, null, testHierarchy, { trickle: false })
    // avg(80, 0) = 40
    expect(result[200]).toBe(40)
  })

  test('stops at MAX_DEPTH — node beyond 3 levels absent from result', async () => {
    const deep = {
      parents: { 101: 200, 200: 300, 300: 400, 400: 500 } as Record<number, number>,
      children: { 500: [400], 400: [300], 300: [200], 200: [101], 101: [] } as Record<number, number[]>,
      metadata: {},
    }
    mockProgressRecords = [
      { content_id: 101, state: 'started', progress_percent: 50, updated_at: 1000 },
    ]
    const result = await computeBubbleTrickleProgresses(101, 50, null, deep, { trickle: false })
    expect(result).toHaveProperty('400')
    expect(result).not.toHaveProperty('500')
  })
})

// ─── bubbleProgress ───────────────────────────────────────────────────────────

describe('bubbleProgress', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('no parent — returns empty', async () => {
    const flat = {
      parents: {} as Record<number, number>,
      children: { 200: [101] } as Record<number, number[]>,
      metadata: {},
    }
    const result = await computeBubbleTrickleProgresses(200, 50, null, flat, { trickle: false })
    expect(result).toEqual({})
  })

  test('propagates averaged progress up multiple levels', async () => {
    mockProgressRecords = [
      { content_id: 101, state: 'started', progress_percent: 50, updated_at: 1000 },
      { content_id: 102, state: 'started', progress_percent: 50, updated_at: 1000 },
    ]
    const result = await computeBubbleTrickleProgresses(101, 50, null, testHierarchy, { trickle: false })
    expect(result[200]).toBe(50)
    expect(result).toHaveProperty('300')
  })

  test('uses stored sibling progress from db, not the passed-in progress value', async () => {
    // 101 passed-in progress = 100, but db has 101=60, 102=40 → avg should be 50 not 100
    mockProgressRecords = [
      { content_id: 101, state: 'started', progress_percent: 60, updated_at: 1000 },
      { content_id: 102, state: 'started', progress_percent: 40, updated_at: 1000 },
    ]
    const result = await computeBubbleTrickleProgresses(101, 100, null, testHierarchy, { trickle: false })
    expect(result[200]).toBe(50)
  })
})

// ─── getNavigateTo ────────────────────────────────────────────────────────────

describe('getNavigateTo', () => {
  const child = (id: number) => ({
    id,
    brand: 'drumeo',
    thumbnail: '',
    type: 'lesson',
    published_on: null,
    status: 'published',
    children: null as any,
  })

  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
    mockLastInteracted = null
  })

  test('returns null for non-navigable content type', async () => {
    const result = await getNavigateTo([{ id: 1, type: 'lesson', children: [] }])
    expect(result[1]).toBeNull()
  })

  test('returns null when children is null', async () => {
    const result = await getNavigateTo([{ id: 1, type: 'course', children: null }])
    expect(result[1]).toBeNull()
  })

  test('returns null when all children are null', async () => {
    const result = await getNavigateTo([{ id: 1, type: 'course', children: [null, null] }])
    expect(result[1]).toBeNull()
  })

  test('returns first child when content has no progress', async () => {
    const result = await getNavigateTo([{ id: 1, type: 'course', children: [child(101), child(102)] }])
    expect(result[1]).toMatchObject({ id: 101 })
  })

  test('course: navigates to last interacted when it is started', async () => {
    mockProgressRecords = [
      { content_id: 1,   state: 'started',  progress_percent: 50,  updated_at: 1000 },
      { content_id: 101, state: 'completed', progress_percent: 100, updated_at: 1000 },
      { content_id: 102, state: 'started',   progress_percent: 30,  updated_at: 1000 },
    ]
    mockLastInteracted = 102
    const result = await getNavigateTo([{ id: 1, type: 'course', children: [child(101), child(102)] }])
    expect(result[1]).toMatchObject({ id: 102 })
  })

  test('course: navigates to first incomplete after last interacted when it is completed', async () => {
    mockProgressRecords = [
      { content_id: 1,   state: 'started',  progress_percent: 50,  updated_at: 1000 },
      { content_id: 101, state: 'completed', progress_percent: 100, updated_at: 1000 },
      { content_id: 102, state: 'completed', progress_percent: 100, updated_at: 1000 },
      { content_id: 103, state: 'started',   progress_percent: 20,  updated_at: 1000 },
    ]
    mockLastInteracted = 102
    const result = await getNavigateTo([{ id: 1, type: 'course', children: [child(101), child(102), child(103)] }])
    expect(result[1]).toMatchObject({ id: 103 })
  })

  test('course: wraps to first child when all children are completed', async () => {
    mockProgressRecords = [
      { content_id: 1,   state: 'started',  progress_percent: 50,  updated_at: 1000 },
      { content_id: 101, state: 'completed', progress_percent: 100, updated_at: 1000 },
      { content_id: 102, state: 'completed', progress_percent: 100, updated_at: 1000 },
    ]
    mockLastInteracted = 102
    const result = await getNavigateTo([{ id: 1, type: 'course', children: [child(101), child(102)] }])
    expect(result[1]).toMatchObject({ id: 101 })
  })

  test('guided-course: navigates to first incomplete child regardless of last interacted', async () => {
    mockProgressRecords = [
      { content_id: 1,   state: 'started',  progress_percent: 50,  updated_at: 1000 },
      { content_id: 101, state: 'completed', progress_percent: 100, updated_at: 1000 },
    ]
    mockLastInteracted = 101
    const result = await getNavigateTo([{ id: 1, type: 'guided-course', children: [child(101), child(102), child(103)] }])
    expect(result[1]).toMatchObject({ id: 102 })
  })
})

// ─── existing integration tests ───────────────────────────────────────────────

describe('contentProgressDataContext', function () {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = [
      { content_id: 234191, state: 'started',   progress_percent: 6,   updated_at: 1731108082, last_interacted_a_la_carte: 1731108082 },
      { content_id: 233955, state: 'started',   progress_percent: 1,   updated_at: 1731108083 },
      { content_id: 259426, state: 'completed', progress_percent: 100, updated_at: 1731108085 },
      { content_id: 190417, state: 'started',   progress_percent: 6,   updated_at: 1731108082 },
      { content_id: 407665, state: 'started',   progress_percent: 6,   updated_at: 1740120139 },
      { content_id: 412986, state: 'completed', progress_percent: 100, updated_at: 1731108085 },
    ]
  })

  test('getProgressState', async () => {
    let result = await getProgressState(234191)
    expect(result).toBe('started')
  })

  test('getProgressState_notExists', async () => {
    let result = await getProgressState(111111)
    expect(result).toBe('')
  })

  test('getAllStarted', async () => {
    let result = await getAllStarted()
    expect(result).toStrictEqual([407665, 233955, 234191, 190417])

    result = await getAllStarted(1)
    expect(result).toStrictEqual([407665])
  })

  test('getAllStartedOrCompleted', async () => {
    let result = await getAllStartedOrCompleted()
    expect(result).toStrictEqual([407665, 259426, 412986, 233955, 234191, 190417])
  })
})
