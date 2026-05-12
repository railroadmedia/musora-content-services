import { initializeTestService } from '../../initializeTests.js'
import {
  averageProgressesFor,
  bubbleProgress,
  computeBubbleTrickleProgresses,
  getAncestorAndSiblingIds,
  getChildrenToDepth,
  trickleProgress,
} from '../../../src/services/contentProgress.js'
import { COLLECTION_ID_SELF, COLLECTION_TYPE } from '../../../src/services/sync/models/ContentProgress'

let mockProgressRecords: any[] = []

jest.mock('../../../src/services/sync/repository-proxy', () => {
  const mockFns = {
    contentProgress: {
      getSomeProgressByContentIds: jest.fn().mockImplementation((contentIds) => {
        const records = mockProgressRecords.filter(r => contentIds.includes(r.content_id))
        return Promise.resolve({ data: records })
      }),
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
  onLearningPathCompletedActions: jest.fn(),
}))

const flatHierarchy = {
  parents: {
    200: 100,
    201: 100,
    202: 100,
  },
  children: {
    100: [200, 201, 202],
  },
  metadata: {},
}

const deepHierarchy = {
  parents: {
    300: 200,
    301: 200,
    200: 100,
    201: 100,
  },
  children: {
    100: [200, 201],
    200: [300, 301],
  },
  metadata: {},
}

const collectionSelf = { type: COLLECTION_TYPE.SELF, id: COLLECTION_ID_SELF }

describe('getChildrenToDepth', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('no children returns empty array', () => {
    const result = getChildrenToDepth(200, flatHierarchy, 1)
    expect(result).toEqual([])
  })

  test('direct children at depth 1', () => {
    const result = getChildrenToDepth(100, flatHierarchy, 1)
    expect(result).toEqual([200, 201, 202])
  })

  test('grandchildren included at depth 2', () => {
    const result = getChildrenToDepth(100, deepHierarchy, 2)
    expect(result).toEqual([200, 201, 300, 301])
  })

  test('depth 0 on leaf node returns empty array', () => {
    const result = getChildrenToDepth(300, deepHierarchy, 0)
    expect(result).toEqual([])
  })
})

describe('getAncestorAndSiblingIds', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('no parent returns empty array', () => {
    const result = getAncestorAndSiblingIds(flatHierarchy, 100)
    expect(result).toEqual([])
  })

  test('returns siblings and parent for direct child', () => {
    const result = getAncestorAndSiblingIds(flatHierarchy, 200)
    expect(result).toContain(100)
    expect(result).toContain(200)
    expect(result).toContain(201)
    expect(result).toContain(202)
  })

  test('returns siblings, parent, parent siblings, and grandparent for nested child', () => {
    const result = getAncestorAndSiblingIds(deepHierarchy, 300)
    expect(result).toContain(300)
    expect(result).toContain(301)
    expect(result).toContain(200)
    expect(result).toContain(201)
    expect(result).toContain(100)
  })

  test('circular ref returns empty array and logs error', () => {
    const circularHierarchy = {
      parents: { 100: 100 },
      children: { 100: [100] },
      metadata: {},
    }
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
    })
    const result = getAncestorAndSiblingIds(circularHierarchy, 100)
    expect(result).toEqual([])
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  test('stops at MAX_DEPTH of 3', () => {
    const fourLevelHierarchy = {
      parents: {
        400: 300,
        300: 200,
        200: 100,
        100: 50,
      },
      children: {
        50: [100],
        100: [200],
        200: [300],
        300: [400],
      },
      metadata: {},
    }
    const result = getAncestorAndSiblingIds(fourLevelHierarchy, 400)
    expect(result).not.toContain(50)
  })
})

describe('averageProgressesFor', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('no parent returns empty object', () => {
    const progressData = new Map([[100, 50]])
    const result = averageProgressesFor(flatHierarchy, 100, progressData)
    expect(result).toEqual({})
  })

  test('single child average equals that child progress', () => {
    const singleChildHierarchy = {
      parents: { 200: 100 },
      children: { 100: [200] },
      metadata: {},
    }
    const progressData = new Map([[200, 60]])
    const result = averageProgressesFor(singleChildHierarchy, 200, progressData)
    expect(result[100]).toBe(60)
  })

  test('multiple children average is rounded sum divided by count', () => {
    const progressData = new Map([[200, 50], [201, 70], [202, 90]])
    const result = averageProgressesFor(flatHierarchy, 200, progressData)
    expect(result[100]).toBe(Math.round((50 + 70 + 90) / 3))
  })

  test('missing child progress defaults to 0', () => {
    const progressData = new Map([[200, 60]])
    const result = averageProgressesFor(flatHierarchy, 200, progressData)
    expect(result[100]).toBe(Math.round((60 + 0 + 0) / 3))
  })

  test('recurses up to compute grandparent progress', () => {
    const progressData = new Map([[300, 80], [301, 40], [201, 50]])
    const result = averageProgressesFor(deepHierarchy, 300, progressData)
    expect(result[200]).toBeDefined()
    expect(result[100]).toBeDefined()
  })
})

describe('trickleProgress', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('no descendants returns empty object', () => {
    const result = trickleProgress(flatHierarchy, 200, collectionSelf, 75)
    expect(result).toEqual({})
  })

  test('all descendants receive same progress value', () => {
    const result = trickleProgress(flatHierarchy, 100, collectionSelf, 100)
    expect(result[200]).toBe(100)
    expect(result[201]).toBe(100)
    expect(result[202]).toBe(100)
  })

  test('trickles through multiple levels in deep hierarchy', () => {
    const result = trickleProgress(deepHierarchy, 100, collectionSelf, 50)
    expect(result[200]).toBe(50)
    expect(result[201]).toBe(50)
    expect(result[300]).toBe(50)
    expect(result[301]).toBe(50)
  })
})

describe('bubbleProgress', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('no parent returns empty object', () => {
    const result = bubbleProgress(flatHierarchy, 100)
    return expect(result).resolves.toEqual({})
  })

  test('averages sibling progress for parent', async () => {
    mockProgressRecords = [
      { content_id: 200, progress_percent: 60 },
      { content_id: 201, progress_percent: 30 },
      { content_id: 202, progress_percent: 0 },
    ]
    const result = await bubbleProgress(flatHierarchy, 200)
    expect(result[100]).toBe(Math.round((60 + 30 + 0) / 3))
  })

  test('one sibling with progress and rest at 0 yields rounded average', async () => {
    mockProgressRecords = [
      { content_id: 201, progress_percent: 90 },
    ]
    const result = await bubbleProgress(flatHierarchy, 200)
    expect(result[100]).toBe(Math.round(90 / 3))
  })

  test('uses contentId own progress in calculation', async () => {
    mockProgressRecords = [
      { content_id: 200, progress_percent: 100 },
      { content_id: 201, progress_percent: 100 },
      { content_id: 202, progress_percent: 100 },
    ]
    const result = await bubbleProgress(flatHierarchy, 200)
    expect(result[100]).toBe(100)
  })
})

describe('computeBubbleTrickleProgresses', () => {
  beforeEach(() => {
    initializeTestService()
    mockProgressRecords = []
  })

  test('both bubble and trickle combine results', async () => {
    mockProgressRecords = [
      { content_id: 200, progress_percent: 100 },
      { content_id: 201, progress_percent: 100 },
      { content_id: 202, progress_percent: 100 },
    ]
    const result = await computeBubbleTrickleProgresses(100, 100, collectionSelf, flatHierarchy, {
      bubble: true,
      trickle: true,
    })
    expect(result[200]).toBe(100)
    expect(result[201]).toBe(100)
    expect(result[202]).toBe(100)
  })

  test('bubble=false returns only trickled descendants', async () => {
    const result = await computeBubbleTrickleProgresses(100, 75, collectionSelf, flatHierarchy, {
      bubble: false,
      trickle: true,
    })
    expect(result[200]).toBe(75)
    expect(result[201]).toBe(75)
    expect(result[202]).toBe(75)
    expect(result[100]).toBeUndefined()
  })

  test('trickle=false returns only bubbled ancestors', async () => {
    mockProgressRecords = [
      { content_id: 200, progress_percent: 60 },
    ]
    const result = await computeBubbleTrickleProgresses(200, 60, collectionSelf, flatHierarchy, {
      bubble: true,
      trickle: false,
    })
    expect(result[100]).toBeDefined()
    expect(result[200]).toBeUndefined()
    expect(result[201]).toBeUndefined()
  })

  test('empty hierarchy returns empty object', async () => {
    const emptyHierarchy = { parents: {}, children: {}, metadata: {} }
    const result = await computeBubbleTrickleProgresses(100, 50, collectionSelf, emptyHierarchy, {
      bubble: true,
      trickle: true,
    })
    expect(result).toEqual({})
  })
})
