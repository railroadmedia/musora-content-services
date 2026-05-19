let mockProgressRecords: any[] = []
let mockRecordsById: Record<string, any> = {}
let mockLastInteracted: string | null = null
let mockStarted: any = { data: [] }
let mockCompleted: any = { data: [] }
let mockCompletedByContentIds: any = { data: [] }
let mockStartedOrCompleted: any = { data: [] }

const repoMocks = {
  contentProgress: {
    getOneProgressByContentId: jest.fn().mockImplementation((contentId: number) => {
      const record = mockProgressRecords.find((r) => r.content_id === contentId)
      return Promise.resolve({ data: record || null })
    }),
    getSomeProgressByContentIds: jest.fn().mockImplementation((contentIds: number[]) => {
      const records = mockProgressRecords.filter((r) => contentIds.includes(r.content_id))
      return Promise.resolve({ data: records })
    }),
    getSomeProgressByRecordIds: jest.fn().mockImplementation((ids: string[]) => {
      const records = ids.map((id) => mockRecordsById[id]).filter(Boolean)
      return Promise.resolve({ data: records })
    }),
    mostRecentlyUpdatedId: jest.fn().mockImplementation(() => {
      return Promise.resolve({ data: mockLastInteracted })
    }),
    started: jest.fn().mockImplementation(() => Promise.resolve(mockStarted)),
    completed: jest.fn().mockImplementation(() => Promise.resolve(mockCompleted)),
    completedByContentIds: jest
      .fn()
      .mockImplementation(() => Promise.resolve(mockCompletedByContentIds)),
    startedOrCompleted: jest.fn().mockImplementation(() => Promise.resolve(mockStartedOrCompleted)),
  },
}

jest.mock('../../../src/services/sync/repository-proxy', () => ({
  __esModule: true,
  default: repoMocks,
  ...repoMocks,
}))

import { Progress } from '../../../src/services/progress'
import { COLLECTION_TYPE } from '../../../src/services/sync/models/ContentProgress'

beforeEach(() => {
  jest.clearAllMocks()
  mockProgressRecords = []
  mockRecordsById = {}
  mockLastInteracted = null
  mockStarted = { data: [] }
  mockCompleted = { data: [] }
  mockCompletedByContentIds = { data: [] }
  mockStartedOrCompleted = { data: [] }
})

describe('Progress.state', () => {
  test('returns state from record', async () => {
    mockProgressRecords = [{ content_id: 100, state: 'started' }]
    expect(await Progress.state(100)).toBe('started')
  })

  test('returns empty string when record missing', async () => {
    expect(await Progress.state(999)).toBe('')
  })

  test('returns empty string when contentId is 0', async () => {
    expect(await Progress.state(0)).toBe('')
    expect(repoMocks.contentProgress.getOneProgressByContentId).not.toHaveBeenCalled()
  })

  test('forwards collection argument', async () => {
    const collection = { id: 5, type: COLLECTION_TYPE.LEARNING_PATH }
    await Progress.state(100, collection)
    expect(repoMocks.contentProgress.getOneProgressByContentId).toHaveBeenCalledWith(
      100,
      collection
    )
  })
})

describe('Progress.stateByIds', () => {
  test('returns Map with states for found ids and defaults for missing', async () => {
    mockProgressRecords = [
      { content_id: 100, state: 'started' },
      { content_id: 300, state: 'completed' },
    ]
    const result = await Progress.stateByIds([100, 300, 999])
    expect(result.get(100)).toBe('started')
    expect(result.get(300)).toBe('completed')
    expect(result.get(999)).toBe('')
  })

  test('returns empty Map for empty input without hitting db', async () => {
    const result = await Progress.stateByIds([])
    expect(result.size).toBe(0)
    expect(repoMocks.contentProgress.getSomeProgressByContentIds).not.toHaveBeenCalled()
  })

  test('forwards collection argument', async () => {
    const collection = { id: 7, type: COLLECTION_TYPE.PLAYLIST }
    await Progress.stateByIds([1, 2], collection)
    expect(repoMocks.contentProgress.getSomeProgressByContentIds).toHaveBeenCalledWith(
      [1, 2],
      collection
    )
  })
})

describe('Progress.stateByRecordIds', () => {
  test('returns object with states keyed by record id', async () => {
    mockRecordsById = {
      '100:self:0': { id: '100:self:0', state: 'started' },
      '300:self:0': { id: '300:self:0', state: 'completed' },
    }
    const result = await Progress.stateByRecordIds(['100:self:0', '300:self:0', '999:self:0'])
    expect(result['100:self:0']).toBe('started')
    expect(result['300:self:0']).toBe('completed')
    expect(result['999:self:0']).toBe('')
  })
})

describe('Progress.playbackPositionByIds', () => {
  test('returns Map with resume_time_seconds for found ids and 0 default', async () => {
    mockProgressRecords = [
      { content_id: 1, resume_time_seconds: 42 },
      { content_id: 2, resume_time_seconds: 0 },
    ]
    const result = await Progress.playbackPositionByIds([1, 2, 3])
    expect(result.get(1)).toBe(42)
    expect(result.get(2)).toBe(0)
    expect(result.get(3)).toBe(0)
  })

  test('returns default 0 when field is null', async () => {
    mockProgressRecords = [{ content_id: 1, resume_time_seconds: null }]
    const result = await Progress.playbackPositionByIds([1])
    expect(result.get(1)).toBe(0)
  })
})

describe('Progress.playbackPositionByRecordIds', () => {
  test('returns object with resume_time_seconds keyed by record id', async () => {
    mockRecordsById = {
      '100:self:0': { id: '100:self:0', resume_time_seconds: 120 },
      '300:self:0': { id: '300:self:0', resume_time_seconds: 0 },
    }
    const result = await Progress.playbackPositionByRecordIds(['100:self:0', '300:self:0', '999:self:0'])
    expect(result['100:self:0']).toBe(120)
    expect(result['300:self:0']).toBe(0)
    expect(result['999:self:0']).toBe(0)
  })

  test('returns default 0 when field is null', async () => {
    mockRecordsById = { '100:self:0': { id: '100:self:0', resume_time_seconds: null } }
    const result = await Progress.playbackPositionByRecordIds(['100:self:0'])
    expect(result['100:self:0']).toBe(0)
  })
})

describe('Progress.lastInteractedOf', () => {
  test('parses numeric string to integer', async () => {
    mockLastInteracted = '101'
    expect(await Progress.lastInteractedOf([100, 101])).toBe(101)
  })

  test('returns undefined when repository returns null', async () => {
    mockLastInteracted = null
    expect(await Progress.lastInteractedOf([100, 101])).toBeUndefined()
  })

  test('forwards args to repository', async () => {
    const collection = { id: 9, type: COLLECTION_TYPE.LEARNING_PATH }
    await Progress.lastInteractedOf([1, 2, 3], collection)
    expect(repoMocks.contentProgress.mostRecentlyUpdatedId).toHaveBeenCalledWith(
      [1, 2, 3],
      collection
    )
  })
})

describe('Progress.incompleteLesson', () => {
  test('guided-course returns first non-completed id', () => {
    const states = new Map<number, string>([
      [1, 'completed'],
      [2, 'started'],
      [3, ''],
    ])
    expect(Progress.incompleteLesson(states, 'guided-course', 999)).toBe(2)
  })

  test('learning-path returns first non-completed id', () => {
    const states = new Map<number, string>([
      [1, 'completed'],
      [2, 'completed'],
      [3, 'started'],
    ])
    expect(Progress.incompleteLesson(states, COLLECTION_TYPE.LEARNING_PATH, 999)).toBe(3)
  })

  test('guided-course falls back to first id when all completed', () => {
    const states = new Map<number, string>([
      [10, 'completed'],
      [20, 'completed'],
    ])
    expect(Progress.incompleteLesson(states, 'guided-course', 999)).toBe(10)
  })

  test('other type: returns next non-completed after currentContentId', () => {
    const states = new Map<number, string>([
      [1, 'completed'],
      [2, 'started'],
      [3, 'completed'],
      [4, 'started'],
    ])
    expect(Progress.incompleteLesson(states, 'course', 2)).toBe(4)
  })

  test('other type: wraps to first id when no incomplete after current', () => {
    const states = new Map<number, string>([
      [1, 'started'],
      [2, 'started'],
      [3, 'completed'],
    ])
    expect(Progress.incompleteLesson(states, 'course', 3)).toBe(1)
  })

  test('other type: returns null when currentContentId not in map', () => {
    const states = new Map<number, string>([
      [1, 'completed'],
      [2, 'started'],
    ])
    expect(Progress.incompleteLesson(states, 'course', 999)).toBeNull()
  })
})

describe('Progress.allStarted', () => {
  test('delegates to repo and applies default options', async () => {
    mockStarted = { data: [1, 2, 3] }
    const result = await Progress.allStarted()
    expect(result).toEqual({ data: [1, 2, 3] })
    expect(repoMocks.contentProgress.started).toHaveBeenCalledWith(null, {
      onlyIds: true,
      include: { aLaCarte: true, learningPaths: false },
    })
  })

  test('forwards custom limit and options', async () => {
    const opts = { onlyIds: false, include: { aLaCarte: false, learningPaths: true } }
    await Progress.allStarted(10, opts)
    expect(repoMocks.contentProgress.started).toHaveBeenCalledWith(10, opts)
  })
})

describe('Progress.allCompleted', () => {
  test('delegates to repo with default options', async () => {
    mockCompleted = { data: [9] }
    const result = await Progress.allCompleted()
    expect(result).toEqual({ data: [9] })
    expect(repoMocks.contentProgress.completed).toHaveBeenCalledWith(null, {
      onlyIds: true,
      include: { aLaCarte: true, learningPaths: false },
    })
  })
})

describe('Progress.allCompletedByIds', () => {
  test('delegates to repo with passed contentIds', async () => {
    mockCompletedByContentIds = { data: [{ content_id: 5 }] }
    const result = await Progress.allCompletedByIds([5, 6])
    expect(result).toEqual({ data: [{ content_id: 5 }] })
    expect(repoMocks.contentProgress.completedByContentIds).toHaveBeenCalledWith([5, 6])
  })
})

describe('Progress.allStartedOrCompleted', () => {
  test('unwraps r.data from repo response', async () => {
    mockStartedOrCompleted = { data: [{ content_id: 1 }, { content_id: 2 }] }
    const result = await Progress.allStartedOrCompleted()
    expect(result).toEqual([{ content_id: 1 }, { content_id: 2 }])
  })

  test('passes limit and updatedAfter window (60 days)', async () => {
    const before = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60
    await Progress.allStartedOrCompleted(25, { brand: 'drumeo' })
    const after = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60

    const args = repoMocks.contentProgress.startedOrCompleted.mock.calls[0][0]
    expect(args.limit).toBe(25)
    expect(args.brand).toBe('drumeo')
    expect(args.updatedAfter).toBeGreaterThanOrEqual(before)
    expect(args.updatedAfter).toBeLessThanOrEqual(after)
  })
})
