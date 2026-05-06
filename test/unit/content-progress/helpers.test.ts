import { initializeTestService } from '../../initializeTests.js'
import {
  filterOutNegativeProgress,
  filterOutLearningPathsForDuplication,
  duplicateProgressForIds,
  normalizeContentId,
  normalizeContentIds,
  normalizeCollection,
  generateRecordId,
  extractFromRecordId,
} from '@/services/contentProgress'
import { COLLECTION_TYPE, COLLECTION_ID_SELF } from '@/services/sync/models/ContentProgress'

let mockProgressRecords: any[] = []

jest.mock('../../../src/services/sync/repository-proxy', () => {
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
      recordProgress: jest.fn().mockResolvedValue({ data: null }),
      requestPushUnsynced: jest.fn(),
    },
    practices: {
      queryAll: jest.fn().mockResolvedValue({ data: [] }),
      getAll: jest.fn().mockResolvedValue({ data: [] }),
    },
  }
  return { default: mockFns, ...mockFns }
})

jest.mock('../../../src/services/sanity.js', () => ({
  getHierarchy: jest.fn().mockResolvedValue({ metadata: {}, parents: {}, children: {} }),
  getHierarchies: jest.fn().mockResolvedValue({ metadata: {}, parents: {}, children: {} }),
  getSanityDate: jest.fn((date: Date) => date.toISOString()),
}))

jest.mock('../../../src/services/content-org/learning-paths', () => ({
  getDailySession: jest.fn(),
  onContentCompletedLearningPathActions: jest.fn(),
}))

const flushPromises = () => new Promise(resolve => setImmediate(resolve))

const mockRepo = jest.requireMock('../../../src/services/sync/repository-proxy')

describe('filterOutNegativeProgress', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('deletes entry when new progress is less than existing', () => {
    const progresses: Record<string, number> = { 101: 30 }
    filterOutNegativeProgress(progresses, { 101: { progress: 70 } })
    expect(progresses).not.toHaveProperty('101')
  })

  test('keeps entry when new progress equals existing', () => {
    const progresses: Record<string, number> = { 101: 50 }
    filterOutNegativeProgress(progresses, { 101: { progress: 50 } })
    expect(progresses).toHaveProperty('101')
  })

  test('keeps entry when new progress is greater than existing', () => {
    const progresses: Record<string, number> = { 101: 80 }
    filterOutNegativeProgress(progresses, { 101: { progress: 50 } })
    expect(progresses).toHaveProperty('101')
  })

  test('keeps entry when existing progress is 0 and new is also 0', () => {
    const progresses: Record<string, number> = { 101: 0 }
    filterOutNegativeProgress(progresses, { 101: { progress: 0 } })
    expect(progresses).toHaveProperty('101')
  })

  test('deletes only entries below existing, keeps others in mixed set', () => {
    const progresses: Record<string, number> = { 101: 20, 102: 80, 103: 40 }
    filterOutNegativeProgress(progresses, {
      101: { progress: 70 },
      102: { progress: 20 },
      103: { progress: 0 },
    })
    expect(progresses).not.toHaveProperty('101')
    expect(progresses).toHaveProperty('102')
    expect(progresses).toHaveProperty('103')
  })

  test('mutates the input object in place', () => {
    const progresses: Record<string, number> = { 101: 10 }
    const ref = progresses
    filterOutNegativeProgress(progresses, { 101: { progress: 50 } })
    expect(ref).toBe(progresses)
    expect(ref).not.toHaveProperty('101')
  })
})

describe('filterOutLearningPathsForDuplication', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('non-LP collection — all entries pass through', () => {
    const progresses = { 101: 30, 102: 50 }
    const result = filterOutLearningPathsForDuplication(progresses, {
      type: COLLECTION_TYPE.SELF,
      id: COLLECTION_ID_SELF,
    })
    expect(result).toEqual({ 101: 30, 102: 50 })
  })

  test('LP collection — excludes entry whose id matches collection id', () => {
    const progresses = { 200: 50, 101: 30 }
    const result = filterOutLearningPathsForDuplication(progresses, {
      type: COLLECTION_TYPE.LEARNING_PATH,
      id: 200,
    })
    expect(result).not.toHaveProperty('200')
    expect(result).toHaveProperty('101')
  })

  test('LP collection — non-matching entries pass through', () => {
    const progresses = { 101: 30, 102: 60 }
    const result = filterOutLearningPathsForDuplication(progresses, {
      type: COLLECTION_TYPE.LEARNING_PATH,
      id: 200,
    })
    expect(result).toEqual({ 101: 30, 102: 60 })
  })

  test('LP collection — multiple entries, only matching one excluded', () => {
    const progresses = { 200: 50, 101: 30, 102: 60 }
    const result = filterOutLearningPathsForDuplication(progresses, {
      type: COLLECTION_TYPE.LEARNING_PATH,
      id: 200,
    })
    expect(Object.keys(result)).toHaveLength(2)
    expect(result).not.toHaveProperty('200')
  })

  test('LP collection — string key is coerced via +id comparison', () => {
    const progresses = { '300': 40, 101: 30 }
    const result = filterOutLearningPathsForDuplication(progresses, {
      type: COLLECTION_TYPE.LEARNING_PATH,
      id: 300,
    })
    expect(result).not.toHaveProperty('300')
    expect(result).toHaveProperty('101')
  })

  test('returns a new object, not the original', () => {
    const progresses = { 101: 30 }
    const result = filterOutLearningPathsForDuplication(progresses, {
      type: COLLECTION_TYPE.SELF,
      id: COLLECTION_ID_SELF,
    })
    expect(result).not.toBe(progresses)
  })
})

describe('duplicateProgressForIds', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('single entry, skipPush=false — requestPushUnsynced called once', async () => {
    await duplicateProgressForIds({ 101: 50 }, false)
    await flushPromises()
    expect(mockRepo.contentProgress.requestPushUnsynced).toHaveBeenCalledTimes(1)
  })

  test('single entry, skipPush=true — requestPushUnsynced not called', async () => {
    await duplicateProgressForIds({ 101: 50 }, true)
    await flushPromises()
    expect(mockRepo.contentProgress.requestPushUnsynced).not.toHaveBeenCalled()
  })

  test('multiple entries, skipPush=false — requestPushUnsynced called exactly once', async () => {
    await duplicateProgressForIds({ 101: 30, 102: 50, 103: 70 }, false)
    await flushPromises()
    expect(mockRepo.contentProgress.requestPushUnsynced).toHaveBeenCalledTimes(1)
  })

  test('multiple entries, skipPush=true — requestPushUnsynced not called', async () => {
    await duplicateProgressForIds({ 101: 30, 102: 50, 103: 70 }, true)
    await flushPromises()
    expect(mockRepo.contentProgress.requestPushUnsynced).not.toHaveBeenCalled()
  })

  test('calls recordProgress for each entry', async () => {
    await duplicateProgressForIds({ 101: 30, 102: 50 }, true)
    await flushPromises()
    expect(mockRepo.contentProgress.recordProgress).toHaveBeenCalledTimes(2)
  })
})

describe('normalizeContentId', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('number — returns same number', () => {
    expect(normalizeContentId(123)).toBe(123)
  })

  test('numeric string — returns number', () => {
    expect(normalizeContentId('123')).toBe(123)
  })

  test('"0" — returns 0', () => {
    expect(normalizeContentId('0')).toBe(0)
  })

  test('non-numeric string — throws with correct message', () => {
    expect(() => normalizeContentId('abc')).toThrow('Invalid content id: abc')
  })
})

describe('normalizeContentIds', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('mixed array — all normalized to numbers', () => {
    expect(normalizeContentIds([1, '2', 3])).toEqual([1, 2, 3])
  })

  test('empty array — returns empty array', () => {
    expect(normalizeContentIds([])).toEqual([])
  })

  test('throws on invalid entry', () => {
    expect(() => normalizeContentIds([1, 'abc' as any])).toThrow('Invalid content id: abc')
  })
})

describe('normalizeCollection', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('null — returns null', () => {
    expect(normalizeCollection(null)).toBeNull()
  })

  test('undefined — returns null', () => {
    expect(normalizeCollection(undefined)).toBeNull()
  })

  test('valid with numeric id — returns { type, id }', () => {
    expect(normalizeCollection({ type: COLLECTION_TYPE.SELF, id: 123 })).toEqual({
      type: 'self',
      id: 123,
    })
  })

  test('valid with string id — returns { type, id: number }', () => {
    expect(normalizeCollection({ type: COLLECTION_TYPE.LEARNING_PATH, id: '456' as any })).toEqual({
      type: 'learning-path-v2',
      id: 456,
    })
  })

  test('invalid type — throws', () => {
    expect(() => normalizeCollection({ type: 'invalid' as any, id: 1 })).toThrow(
      'Invalid collection type: invalid',
    )
  })

  test('non-numeric string id — throws', () => {
    expect(() => normalizeCollection({ type: COLLECTION_TYPE.SELF, id: 'abc' as any })).toThrow(
      'Invalid collection id: abc',
    )
  })
})

describe('generateRecordId', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('0 contentId — returns null (falsy check)', () => {
    expect(generateRecordId(0, null)).toBeNull()
  })

  test('null contentId — returns null', () => {
    expect(generateRecordId(null as any, null)).toBeNull()
  })

  test('null collection — uses SELF defaults', () => {
    expect(generateRecordId(123, null)).toBe(
      `123:${COLLECTION_TYPE.SELF}:${COLLECTION_ID_SELF}`,
    )
  })

  test('LP collection — returns correct format', () => {
    expect(
      generateRecordId(123, { type: COLLECTION_TYPE.LEARNING_PATH, id: 456 }),
    ).toBe('123:learning-path-v2:456')
  })

  test('string contentId — normalized before use', () => {
    expect(generateRecordId('123' as any, null)).toBe(
      `123:${COLLECTION_TYPE.SELF}:${COLLECTION_ID_SELF}`,
    )
  })
})

describe('extractFromRecordId', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('null — returns null', () => {
    expect(extractFromRecordId(null)).toBeNull()
  })

  test('undefined — returns null', () => {
    expect(extractFromRecordId(undefined as any)).toBeNull()
  })

  test('self record id — correct parse', () => {
    expect(extractFromRecordId('123:self:0')).toEqual({
      contentId: 123,
      collection: { type: 'self', id: 0 },
    })
  })

  test('LP record id — correct parse', () => {
    expect(extractFromRecordId('456:learning-path-v2:789')).toEqual({
      contentId: 456,
      collection: { type: 'learning-path-v2', id: 789 },
    })
  })

  test('missing collection type — defaults to SELF', () => {
    expect(extractFromRecordId('123::')).toEqual({
      contentId: 123,
      collection: { type: COLLECTION_TYPE.SELF, id: COLLECTION_ID_SELF },
    })
  })

  test('missing collection id — defaults to COLLECTION_ID_SELF', () => {
    expect(extractFromRecordId('123:self:')).toEqual({
      contentId: 123,
      collection: { type: 'self', id: COLLECTION_ID_SELF },
    })
  })
})
