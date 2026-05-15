let mockProgressRecords: any[] = []
let mockLastInteracted: number | null = null

jest.mock('../../../../../src/services/sync/repository-proxy', () => {
  const mockFns = {
    contentProgress: {
      getOneProgressByContentId: jest.fn().mockImplementation((contentId) => {
        const record = mockProgressRecords.find((r) => r.content_id === contentId)
        return Promise.resolve({ data: record || null })
      }),
      getSomeProgressByContentIds: jest.fn().mockImplementation((contentIds) => {
        const records = mockProgressRecords.filter((r) => contentIds.includes(r.content_id))
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

jest.mock('../../../../../src/services/content-org/learning-paths', () => ({
  getDailySession: jest.fn().mockResolvedValue(null),
  onLearningPathCompletedActions: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../../../../src/services/sanity.js', () => ({
  getHierarchy: jest.fn().mockResolvedValue({ metadata: {}, parents: {}, children: {} }),
  getHierarchies: jest.fn().mockResolvedValue({ metadata: {}, parents: {}, children: {} }),
  getSanityDate: jest.fn((date: Date) => date.toISOString()),
}))

import { initializeTestService } from '../../../../initializeTests.js'
import {
  NAVIGATE_TO_FIELD,
  decorateNavigateTo,
  navigateToDecorator,
  type NavigateToDecoratable,
} from '../../../../../src/lib/sanity/decorators/navigate-to'
import { COLLECTION_TYPE } from '../../../../../src/services/sync/models/ContentProgress'

const child = (id: number, type = 'course-lesson'): NavigateToDecoratable => ({
  id,
  type,
  brand: 'drumeo',
  thumbnail: '',
  published_on: null,
  status: 'published',
})

const parent = (
  id: number,
  type: string,
  children: NavigateToDecoratable[]
): NavigateToDecoratable => ({
  id,
  type,
  brand: 'drumeo',
  thumbnail: '',
  published_on: null,
  status: 'published',
  children,
})

beforeEach(() => {
  jest.clearAllMocks()
  initializeTestService()
  mockProgressRecords = []
  mockLastInteracted = null
})

describe('navigate-to decorator', () => {
  describe('navigateToDecorator (const)', () => {
    test('field is navigateTo', () => {
      expect(navigateToDecorator.field).toBe('navigateTo')
      expect(NAVIGATE_TO_FIELD).toBe('navigateTo')
    })
  })

  describe('decorateNavigateTo', () => {
    test('non-navigable type → null', async () => {
      const item = parent(1, 'lesson', [child(101)])
      const result = await decorateNavigateTo(item)
      expect(result.navigateTo).toBeNull()
    })

    test('empty children → null', async () => {
      const item = parent(1, 'course', [])
      const result = await decorateNavigateTo(item)
      expect(result.navigateTo).toBeNull()
    })

    test('not-started course → first child', async () => {
      const item = parent(1, 'course', [child(101), child(102)])
      const result = await decorateNavigateTo(item)
      expect(result.navigateTo).toMatchObject({ id: 101, child: null })
    })

    test('course started, lastInteracted started → lastInteracted', async () => {
      mockProgressRecords = [
        { content_id: 1, state: 'started', progress_percent: 50, updated_at: 1000 },
        { content_id: 101, state: 'started', progress_percent: 30, updated_at: 900 },
        { content_id: 102, state: 'started', progress_percent: 10, updated_at: 1000 },
      ]
      mockLastInteracted = 101
      const item = parent(1, 'course', [child(101), child(102)])
      const result = await decorateNavigateTo(item)
      expect(result.navigateTo).toMatchObject({ id: 101 })
    })

    test('course started, lastInteracted completed → first incomplete after', async () => {
      mockProgressRecords = [
        { content_id: 1, state: 'started', progress_percent: 60, updated_at: 1000 },
        { content_id: 101, state: 'completed', progress_percent: 100, updated_at: 900 },
        { content_id: 102, state: 'completed', progress_percent: 100, updated_at: 1000 },
        { content_id: 103, state: 'started', progress_percent: 20, updated_at: 800 },
      ]
      mockLastInteracted = 101
      const item = parent(1, 'course', [child(101), child(102), child(103)])
      const result = await decorateNavigateTo(item)
      expect(result.navigateTo).toMatchObject({ id: 103 })
    })

    test('guided-course started → first incomplete regardless of lastInteracted', async () => {
      mockProgressRecords = [
        { content_id: 1, state: 'started', progress_percent: 50, updated_at: 1000 },
        { content_id: 101, state: '', progress_percent: 0, updated_at: 0 },
        { content_id: 102, state: 'completed', progress_percent: 100, updated_at: 1000 },
        { content_id: 103, state: '', progress_percent: 0, updated_at: 0 },
      ]
      mockLastInteracted = 102
      const item = parent(1, 'guided-course', [child(101), child(102), child(103)])
      const result = await decorateNavigateTo(item)
      expect(result.navigateTo).toMatchObject({ id: 101 })
    })

    test('learning-path-v2 started → first incomplete regardless of lastInteracted', async () => {
      mockProgressRecords = [
        { content_id: 1, state: 'started', progress_percent: 50, updated_at: 1000 },
        { content_id: 101, state: '', progress_percent: 0, updated_at: 0 },
        { content_id: 102, state: 'completed', progress_percent: 100, updated_at: 1000 },
        { content_id: 103, state: '', progress_percent: 0, updated_at: 0 },
      ]
      mockLastInteracted = 102
      const item = parent(1, COLLECTION_TYPE.LEARNING_PATH, [child(101), child(102), child(103)])
      const result = await decorateNavigateTo(item)
      expect(result.navigateTo).toMatchObject({ id: 101 })
    })

    test('two-depth: not-started course-collection nests first child nav', async () => {
      const courseChild = parent(101, 'course', [child(201), child(202)])
      const collection = parent(1, 'course-collection', [courseChild, parent(102, 'course', [])])
      const result = await decorateNavigateTo(collection)
      expect(result.navigateTo).toMatchObject({
        id: 101,
        child: { id: 201 },
      })
    })

    test('two-depth: started course-collection nests lastInteracted child nav', async () => {
      mockProgressRecords = [
        { content_id: 1, state: 'started', progress_percent: 50, updated_at: 1000 },
        { content_id: 101, state: 'started', progress_percent: 50, updated_at: 1000 },
        { content_id: 102, state: '', progress_percent: 0, updated_at: 0 },
      ]
      mockLastInteracted = 102
      const courseA = parent(101, 'course', [child(201), child(202)])
      const courseB = parent(102, 'course', [child(301), child(302)])
      const collection = parent(1, 'course-collection', [courseA, courseB])
      const result = await decorateNavigateTo(collection)
      expect(result.navigateTo).toMatchObject({
        id: 102,
        child: { id: 301 },
      })
    })

    test('decorates every item in an array', async () => {
      const items = [parent(1, 'course', [child(101)]), parent(2, 'lesson', [child(201)])]
      const result = await decorateNavigateTo(items)
      expect(result[0].navigateTo).toMatchObject({ id: 101 })
      expect(result[1].navigateTo).toBeNull()
    })

    test('returns the same reference it was given', async () => {
      const items = [parent(1, 'course', [child(101)])]
      const result = await decorateNavigateTo(items)
      expect(result).toBe(items)
    })

    test('navigateToDecorator.compute fires once per top-level item, never on descendants', async () => {
      const spy = jest.spyOn(navigateToDecorator, 'compute')
      const courseChild = parent(101, 'course', [child(201), child(202)])
      const collection = parent(1, 'course-collection', [courseChild, parent(102, 'course', [])])
      const standalone = parent(2, 'course', [child(301)])
      await decorateNavigateTo([collection, standalone])
      expect(spy).toHaveBeenCalledTimes(2)
      expect(spy).toHaveBeenCalledWith(collection)
      expect(spy).toHaveBeenCalledWith(standalone)
      spy.mockRestore()
    })

    test('descendants of decorated items do not receive navigateTo field', async () => {
      const item = parent(1, 'course', [child(101), child(102)])
      const result = await decorateNavigateTo(item)
      expect(result.navigateTo).not.toBeNull()
      const children = result.children as NavigateToDecoratable[]
      expect((children[0] as Record<string, unknown>).navigateTo).toBeUndefined()
      expect((children[1] as Record<string, unknown>).navigateTo).toBeUndefined()
    })

    test('skill-pack uses course flow', async () => {
      mockProgressRecords = [
        { content_id: 1, state: 'started', progress_percent: 60, updated_at: 1000 },
        { content_id: 101, state: 'completed', progress_percent: 100, updated_at: 900 },
        { content_id: 102, state: 'started', progress_percent: 20, updated_at: 1000 },
      ]
      mockLastInteracted = 102
      const item = parent(1, 'skill-pack', [child(101), child(102)])
      const result = await decorateNavigateTo(item)
      expect(result.navigateTo).toMatchObject({ id: 102 })
    })

    test('song-tutorial uses course flow', async () => {
      mockProgressRecords = [
        { content_id: 1, state: 'started', progress_percent: 50, updated_at: 1000 },
        { content_id: 101, state: 'completed', progress_percent: 100, updated_at: 900 },
        { content_id: 102, state: '', progress_percent: 0, updated_at: 0 },
      ]
      mockLastInteracted = 101
      const item = parent(1, 'song-tutorial', [child(101), child(102)])
      const result = await decorateNavigateTo(item)
      expect(result.navigateTo).toMatchObject({ id: 102 })
    })

    test('two-depth started but lastInteracted child not in collection → null', async () => {
      mockProgressRecords = [
        { content_id: 1, state: 'started', progress_percent: 50, updated_at: 1000 },
      ]
      mockLastInteracted = 999
      const courseA = parent(101, 'course', [child(201)])
      const collection = parent(1, 'course-collection', [courseA])
      const result = await decorateNavigateTo(collection)
      expect(result.navigateTo).toBeNull()
    })

    test('output shape matches NavigateTo interface', async () => {
      const item = parent(1, 'course', [child(101)])
      const result = await decorateNavigateTo(item)
      expect(result.navigateTo).toEqual({
        id: 101,
        type: 'course-lesson',
        brand: 'drumeo',
        thumbnail: '',
        published_on: null,
        status: 'published',
        child: null,
        collection: null,
      })
    })
  })
})
