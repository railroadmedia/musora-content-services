import { initializeTestService } from '../../initializeTests.js'
import {
  getNavigateToForMethod,
  getNavigateTo,
  findIncompleteLesson,
  buildNavigateTo,
  extractFromRecordId,
} from '@/services/contentProgress'
import { COLLECTION_TYPE } from '@/services/sync/models/ContentProgress'

let mockProgressRecords: any[] = []
let mockLastInteracted: number | null = null

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
      mostRecentlyUpdatedId: jest.fn().mockImplementation(() => {
        return Promise.resolve({ data: mockLastInteracted })
      }),
    },
    practices: {
      queryAll: jest.fn().mockResolvedValue({ data: [] }),
      getAll: jest.fn().mockResolvedValue({ data: [] }),
    },
  }
  return { default: mockFns, ...mockFns }
})

jest.mock('../../../src/services/content-org/learning-paths', () => ({
  getDailySession: jest.fn().mockResolvedValue(null),
  onContentCompletedLearningPathActions: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../../src/services/sanity.js', () => ({
  getHierarchy: jest.fn().mockResolvedValue({ metadata: {}, parents: {}, children: {} }),
  getHierarchies: jest.fn().mockResolvedValue({ metadata: {}, parents: {}, children: {} }),
  getSanityDate: jest.fn((date: Date) => date.toISOString()),
}))

const { getDailySession } = jest.requireMock('../../../src/services/content-org/learning-paths')

const child = (id: number, type = 'lesson') => ({
  id,
  brand: 'drumeo',
  thumbnail: '',
  type,
  published_on: null,
  status: 'published',
  children: null as any,
})

beforeEach(() => {
  jest.clearAllMocks()
  initializeTestService()
  mockProgressRecords = []
  mockLastInteracted = null
})

// ─── buildNavigateTo ──────────────────────────────────────────────────────────

describe('buildNavigateTo', () => {
  test('null content returns null', () => {
    expect(buildNavigateTo(null)).toBeNull()
  })

  test('valid content returns correct shape', () => {
    const content = { id: 101, brand: 'drumeo', thumbnail: 'thumb.jpg', type: 'lesson', published_on: '2024-01-01', status: 'published' }
    const result = buildNavigateTo(content)
    expect(result).toEqual({
      brand: 'drumeo',
      thumbnail: 'thumb.jpg',
      id: 101,
      type: 'lesson',
      published_on: '2024-01-01',
      status: 'published',
      child: null,
      collection: null,
    })
  })

  test('missing fields fall back to defaults', () => {
    const result = buildNavigateTo({ id: 5 })
    expect(result).toMatchObject({
      brand: '',
      thumbnail: '',
      id: 5,
      type: '',
      published_on: null,
      status: '',
      child: null,
      collection: null,
    })
  })

  test('child and collection args pass through', () => {
    const childObj = { id: 200, brand: 'drumeo', thumbnail: '', type: 'lesson', published_on: null, status: 'published' }
    const collection = { type: COLLECTION_TYPE.LEARNING_PATH, id: 999 }
    const result = buildNavigateTo({ id: 100 }, childObj, collection)
    expect(result?.child).toBe(childObj)
    expect(result?.collection).toBe(collection)
  })
})

// ─── findIncompleteLesson ─────────────────────────────────────────────────────

describe('findIncompleteLesson', () => {
  describe('course type', () => {
    test('finds first incomplete after currentContentId', () => {
      const progresses = new Map([
        [101, 'completed'],
        [102, 'completed'],
        [103, 'started'],
        [104, ''],
      ])
      expect(findIncompleteLesson(progresses, 102, 'course')).toBe(103)
    })

    test('wraps to first when all after current are completed', () => {
      const progresses = new Map([
        [101, 'started'],
        [102, 'completed'],
        [103, 'completed'],
      ])
      expect(findIncompleteLesson(progresses, 102, 'course')).toBe(101)
    })

    test('returns null when currentContentId not in ids', () => {
      const progresses = new Map([
        [101, 'started'],
        [102, 'completed'],
      ])
      expect(findIncompleteLesson(progresses, 999, 'course')).toBeNull()
    })

    test('works with all completed — wraps to first', () => {
      const progresses = new Map([
        [101, 'completed'],
        [102, 'completed'],
        [103, 'completed'],
      ])
      expect(findIncompleteLesson(progresses, 102, 'course')).toBe(101)
    })
  })

  describe('guided-course type', () => {
    test('finds first non-completed regardless of position', () => {
      const progresses = new Map([
        [101, 'completed'],
        [102, ''],
        [103, 'started'],
      ])
      expect(findIncompleteLesson(progresses, 101, 'guided-course')).toBe(102)
    })

    test('returns first id when all completed', () => {
      const progresses = new Map([
        [101, 'completed'],
        [102, 'completed'],
        [103, 'completed'],
      ])
      expect(findIncompleteLesson(progresses, 103, 'guided-course')).toBe(101)
    })
  })

  describe('learning-path-v2 type', () => {
    test('finds first non-completed like guided-course', () => {
      const progresses = new Map([
        [101, 'completed'],
        [102, 'started'],
        [103, ''],
      ])
      expect(findIncompleteLesson(progresses, 103, 'learning-path-v2')).toBe(102)
    })

    test('returns first id when all completed', () => {
      const progresses = new Map([
        [101, 'completed'],
        [102, 'completed'],
      ])
      expect(findIncompleteLesson(progresses, 101, 'learning-path-v2')).toBe(101)
    })
  })

  describe('Map vs Object input', () => {
    test('works with Map input', () => {
      const progresses = new Map([
        [101, 'completed'],
        [102, ''],
      ])
      expect(findIncompleteLesson(progresses, 101, 'course')).toBe(102)
    })

    test('works with Object input', () => {
      const progresses = { 101: 'completed', 102: '' }
      expect(findIncompleteLesson(progresses, 101, 'course')).toBe(102)
    })
  })
})

// ─── getNavigateTo ────────────────────────────────────────────────────────────

describe('getNavigateTo', () => {
  test('null entry in data array skipped', async () => {
    const result = await getNavigateTo([null as any, { id: 1, type: 'lesson', children: [] }])
    expect(result[1]).toBeNull()
    expect(Object.keys(result)).not.toContain('null')
    expect(Object.keys(result)).not.toContain('undefined')
  })

  test('non-navigable type returns null', async () => {
    const result = await getNavigateTo([{ id: 1, type: 'lesson', children: [child(101)] }])
    expect(result[1]).toBeNull()
  })

  test('null children returns null', async () => {
    const result = await getNavigateTo([{ id: 1, type: 'course', children: null }])
    expect(result[1]).toBeNull()
  })

  test('empty children after filtering nulls returns null', async () => {
    const result = await getNavigateTo([{ id: 1, type: 'course', children: [null, null] }])
    expect(result[1]).toBeNull()
  })

  test('content not started navigates to first child', async () => {
    const result = await getNavigateTo([{ id: 1, type: 'course', children: [child(101), child(102)] }])
    expect(result[1]).toMatchObject({ id: 101 })
  })

  test('course started lastInteracted started navigates to lastInteracted child', async () => {
    mockProgressRecords = [
      { content_id: 1,   state: 'started',  progress_percent: 50,  updated_at: 1000 },
      { content_id: 101, state: 'completed', progress_percent: 100, updated_at: 900 },
      { content_id: 102, state: 'started',  progress_percent: 30,  updated_at: 1000 },
    ]
    mockLastInteracted = 102
    const result = await getNavigateTo([{ id: 1, type: 'course', children: [child(101), child(102)] }])
    expect(result[1]).toMatchObject({ id: 102 })
  })

  test('course started lastInteracted completed navigates to first incomplete after lastInteracted', async () => {
    mockProgressRecords = [
      { content_id: 1,   state: 'started',  progress_percent: 60,  updated_at: 1000 },
      { content_id: 101, state: 'completed', progress_percent: 100, updated_at: 900 },
      { content_id: 102, state: 'completed', progress_percent: 100, updated_at: 1000 },
      { content_id: 103, state: 'started',  progress_percent: 20,  updated_at: 800 },
    ]
    mockLastInteracted = 102
    const result = await getNavigateTo([{ id: 1, type: 'course', children: [child(101), child(102), child(103)] }])
    expect(result[1]).toMatchObject({ id: 103 })
  })

  test('course started all children completed wraps to first child', async () => {
    mockProgressRecords = [
      { content_id: 1,   state: 'started',  progress_percent: 100, updated_at: 1000 },
      { content_id: 101, state: 'completed', progress_percent: 100, updated_at: 900 },
      { content_id: 102, state: 'completed', progress_percent: 100, updated_at: 1000 },
    ]
    mockLastInteracted = 102
    const result = await getNavigateTo([{ id: 1, type: 'course', children: [child(101), child(102)] }])
    expect(result[1]).toMatchObject({ id: 101 })
  })

  test('guided-course started navigates to first incomplete child', async () => {
    mockProgressRecords = [
      { content_id: 1,   state: 'started',  progress_percent: 50,  updated_at: 1000 },
      { content_id: 101, state: 'completed', progress_percent: 100, updated_at: 900 },
    ]
    mockLastInteracted = 101
    const result = await getNavigateTo([{ id: 1, type: 'guided-course', children: [child(101), child(102), child(103)] }])
    expect(result[1]).toMatchObject({ id: 102 })
  })
})

// ─── getNavigateToForMethod ───────────────────────────────────────────────────

describe('getNavigateToForMethod', () => {
  const lpContent = (id: number, children: any[]) => ({
    id,
    brand: 'drumeo',
    thumbnail: '',
    type: COLLECTION_TYPE.LEARNING_PATH,
    published_on: null,
    status: 'published',
    children,
    record_id: `${id}:${COLLECTION_TYPE.LEARNING_PATH}:${id}`,
  })

  const nonLpContent = (id: number) => ({
    id,
    brand: 'drumeo',
    thumbnail: '',
    type: 'course',
    published_on: null,
    status: 'published',
    children: [child(201), child(202)],
    record_id: `${id}:self:0`,
  })

  test('non-LP content type returns null', async () => {
    const result = await getNavigateToForMethod([nonLpContent(1)])
    expect(result[1]).toBeNull()
  })

  test('LP type no daily session navigates to first incomplete child', async () => {
    getDailySession.mockResolvedValueOnce(null)
    const result = await getNavigateToForMethod([lpContent(10, [child(301), child(302), child(303)])])
    expect(result[10]).toMatchObject({ id: 301 })
  })

  test('LP type active learning path with daily session navigates using daily session', async () => {
    mockProgressRecords = [
      { content_id: 301, state: 'completed', progress_percent: 100, updated_at: 900 },
    ]
    getDailySession.mockResolvedValueOnce({
      active_learning_path_id: 10,
      daily_session: [{ content_ids: [301, 302] }],
    })
    const result = await getNavigateToForMethod([lpContent(10, [child(301), child(302), child(303)])])
    expect(result[10]).toMatchObject({ id: 302 })
  })

  test('null content entries skipped', async () => {
    getDailySession.mockResolvedValueOnce(null)
    const validContent = lpContent(10, [child(301)])
    const result = await getNavigateToForMethod([validContent, null as any])
    expect(Object.keys(result)).toContain('10')
    expect(Object.keys(result)).not.toContain('null')
    expect(Object.keys(result)).not.toContain('undefined')
  })
})
