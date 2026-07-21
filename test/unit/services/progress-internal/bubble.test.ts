let mockProgressRecords: any[] = []
let mockRecordProgressMany = jest.fn()
let mockEraseProgressMany = jest.fn()

const repoMocks = {
  contentProgress: {
    getSomeProgressByContentIds: jest.fn().mockImplementation((contentIds: number[]) => {
      const records = mockProgressRecords.filter((r) => contentIds.includes(r.content_id))
      return Promise.resolve({ data: records })
    }),
    recordProgressMany: mockRecordProgressMany,
    eraseProgressMany: mockEraseProgressMany,
  },
}

jest.mock('../../../../src/services/sync/repository-proxy', () => ({
  __esModule: true,
  default: repoMocks,
  ...repoMocks,
}))

import {
  averageProgressesFor,
  bubbleAndTrickleProgressesSafely,
  bubbleProgress,
  computeBubbleTrickleProgresses,
  filterOutNegativeProgress,
  getAncestorAndSiblingIds,
  getChildrenToDepth,
  trickleProgress,
} from '../../../../src/services/progress/internal/bubble'
import type { Hierarchy } from '../../../../src/services/progress/types'
import { COLLECTION_TYPE } from '../../../../src/services/sync/models/ContentProgress'

beforeEach(() => {
  jest.clearAllMocks()
  mockProgressRecords = []
  mockRecordProgressMany.mockResolvedValue({ data: null })
  mockEraseProgressMany.mockResolvedValue({ data: null })
})

describe('filterOutNegativeProgress', () => {
  test('drops entry when new progress is less than existing', () => {
    const result = filterOutNegativeProgress(
      { 101: 30 },
      { 101: { progress: 70, last_update: 0, status: 'started' } }
    )
    expect(result).not.toHaveProperty('101')
  })

  test('keeps entry when new progress equals existing', () => {
    const result = filterOutNegativeProgress(
      { 101: 50 },
      { 101: { progress: 50, last_update: 0, status: 'started' } }
    )
    expect(result[101]).toBe(50)
  })

  test('keeps entry when new progress is greater than existing', () => {
    const result = filterOutNegativeProgress(
      { 101: 80 },
      { 101: { progress: 50, last_update: 0, status: 'started' } }
    )
    expect(result[101]).toBe(80)
  })

  test('keeps entry when no existing snapshot', () => {
    const result = filterOutNegativeProgress({ 101: 10 }, {})
    expect(result[101]).toBe(10)
  })

  test('drops only entries below existing, keeps others in mixed set', () => {
    const result = filterOutNegativeProgress(
      { 101: 20, 102: 80, 103: 40 },
      {
        101: { progress: 70, last_update: 0, status: 'started' },
        102: { progress: 20, last_update: 0, status: 'started' },
        103: { progress: 0, last_update: 0, status: '' },
      }
    )
    expect(result).not.toHaveProperty('101')
    expect(result[102]).toBe(80)
    expect(result[103]).toBe(40)
  })

  test('returns new object, does not mutate input', () => {
    const progresses = { 101: 10 }
    const result = filterOutNegativeProgress(progresses, {
      101: { progress: 50, last_update: 0, status: 'started' },
    })
    expect(result).not.toBe(progresses)
    expect(progresses[101]).toBe(10)
  })
})

describe('getChildrenToDepth', () => {
  const hierarchy: Hierarchy = {
    parents: { 2: 1, 3: 1, 4: 2 },
    children: { 1: [2, 3], 2: [4], 3: [], 4: [] },
  }

  test('returns direct children', () => {
    expect(getChildrenToDepth(1, hierarchy)).toEqual(expect.arrayContaining([2, 3]))
  })

  test('returns empty when no children', () => {
    expect(getChildrenToDepth(4, hierarchy)).toEqual([])
  })

  test('returns empty for unknown parent', () => {
    expect(getChildrenToDepth(99, hierarchy)).toEqual([])
  })
})

describe('getAncestorAndSiblingIds', () => {
  const hierarchy: Hierarchy = {
    parents: { 2: 1, 3: 1, 4: 2, 5: 2 },
    children: { 1: [2, 3], 2: [4, 5] },
  }

  test('returns siblings and parent for child node', () => {
    const result = getAncestorAndSiblingIds(hierarchy, 4)
    expect(result).toEqual(expect.arrayContaining([5, 2]))
  })

  test('returns empty for root', () => {
    expect(getAncestorAndSiblingIds(hierarchy, 1)).toEqual([])
  })

  test('handles circular dependency without infinite loop', () => {
    const circular: Hierarchy = { parents: { 1: 1 }, children: { 1: [] } }
    expect(getAncestorAndSiblingIds(circular, 1)).toEqual([])
  })

  test('logs an error when a circular dependency is detected', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const circular: Hierarchy = { parents: { 1: 1 }, children: { 1: [] } }
    getAncestorAndSiblingIds(circular, 1)
    expect(errorSpy).toHaveBeenCalledWith('Circular dependency detected for contentId', 1)
    errorSpy.mockRestore()
  })
})

describe('averageProgressesFor', () => {
  const hierarchy: Hierarchy = {
    parents: { 2: 1, 3: 1, 4: 2, 5: 2 },
    children: { 1: [2, 3], 2: [4, 5] },
  }

  test('averages child progresses up the chain', () => {
    const progress = new Map<number, number>([
      [4, 100],
      [5, 0],
      [2, 50],
      [3, 50],
    ])
    const result = averageProgressesFor(hierarchy, 4, progress)
    expect(result[2]).toBe(50)
    expect(result[1]).toBe(50)
  })

  test('returns empty for root', () => {
    expect(averageProgressesFor(hierarchy, 1, new Map())).toEqual({})
  })

  test('treats missing child progress as 0', () => {
    const progress = new Map<number, number>([[4, 80]])
    const result = averageProgressesFor(hierarchy, 4, progress)
    expect(result[2]).toBe(40)
  })
})

describe('trickleProgress', () => {
  const hierarchy: Hierarchy = {
    parents: { 2: 1, 3: 1, 4: 2 },
    children: { 1: [2, 3], 2: [4], 3: [], 4: [] },
  }

  test('returns descendants with given progress', () => {
    const result = trickleProgress(hierarchy, 1, 75)
    expect(result[2]).toBe(75)
    expect(result[3]).toBe(75)
  })

  test('returns empty when no descendants', () => {
    expect(trickleProgress(hierarchy, 4, 100)).toEqual({})
  })
})

describe('bubbleProgress', () => {
  const hierarchy: Hierarchy = {
    parents: { 2: 1, 3: 1 },
    children: { 1: [2, 3] },
  }

  test('aggregates sibling progresses into parent', async () => {
    mockProgressRecords = [
      { content_id: 2, progress_percent: 100 },
      { content_id: 3, progress_percent: 0 },
    ]
    const result = await bubbleProgress(hierarchy, 2)
    expect(result[1]).toBe(50)
  })
})

describe('computeBubbleTrickleProgresses', () => {
  const hierarchy: Hierarchy = {
    parents: { 2: 1 },
    children: { 1: [2], 2: [] },
  }

  test('combines bubble and trickle', async () => {
    mockProgressRecords = [{ content_id: 2, progress_percent: 80 }]
    const result = await computeBubbleTrickleProgresses(2, 80, hierarchy)
    expect(result[1]).toBe(80)
  })

  test('respects { bubble: false }', async () => {
    mockProgressRecords = [{ content_id: 2, progress_percent: 80 }]
    const result = await computeBubbleTrickleProgresses(2, 80, hierarchy, undefined, {
      bubble: false,
    })
    expect(result).not.toHaveProperty('1')
  })

  test('respects { trickle: false }', async () => {
    const result = await computeBubbleTrickleProgresses(1, 50, hierarchy, undefined, {
      trickle: false,
    })
    expect(result).not.toHaveProperty('2')
  })
})

describe('bubbleAndTrickleProgressesSafely', () => {
  test('passes positive progresses to recordProgressMany', async () => {
    await bubbleAndTrickleProgressesSafely({ 1: 50, 2: 100 }, {})
    expect(mockRecordProgressMany).toHaveBeenCalledWith(
      { 1: 50, 2: 100 },
      undefined,
      {},
      { skipPush: true, accessedDirectly: true, allowRegression: true }
    )
    expect(mockEraseProgressMany).not.toHaveBeenCalled()
  })

  test('isResetAction separates zero progresses into eraseProgressMany', async () => {
    await bubbleAndTrickleProgressesSafely(
      { 1: 50, 2: 0, 3: 0 },
      {},
      { isResetAction: true }
    )
    expect(mockRecordProgressMany).toHaveBeenCalledWith(
      { 1: 50 },
      undefined,
      {},
      expect.objectContaining({ allowRegression: true })
    )
    expect(mockEraseProgressMany).toHaveBeenCalledWith([2, 3], undefined, { skipPush: true })
  })

  test('forwards collection argument', async () => {
    const collection = { type: COLLECTION_TYPE.LEARNING_PATH, id: 10 }
    await bubbleAndTrickleProgressesSafely({ 1: 50 }, {}, {}, collection)
    expect(mockRecordProgressMany).toHaveBeenCalledWith(
      { 1: 50 },
      collection,
      {},
      expect.anything()
    )
  })

  test('forwards accessedDirectly option', async () => {
    await bubbleAndTrickleProgressesSafely({ 1: 50 }, {}, { accessedDirectly: false })
    expect(mockRecordProgressMany).toHaveBeenCalledWith(
      { 1: 50 },
      undefined,
      {},
      expect.objectContaining({ accessedDirectly: false })
    )
  })

  test('skips both calls when all empty', async () => {
    await bubbleAndTrickleProgressesSafely({}, {})
    expect(mockRecordProgressMany).not.toHaveBeenCalled()
    expect(mockEraseProgressMany).not.toHaveBeenCalled()
  })
})
