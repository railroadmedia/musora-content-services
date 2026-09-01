import { initializeTestService } from '../initializeTests.js'
import {
  getUserMonthlyStats,
  getUserWeeklyStats,
  recordUserPractice,
  getPracticeSessions,
  getWeeklyPracticeSessions,
} from '../../src/services/userActivity.js'

let mockPracticesData: {
  date: string;
  duration_seconds: number
}[] = []

jest.mock('../../src/services/sync/repository-proxy.ts', () => {
  const mockFns = {
    practices: {
      queryAll: jest.fn().mockImplementation(() => Promise.resolve({ data: mockPracticesData })),
      getAll: jest.fn().mockImplementation(() => Promise.resolve({ data: mockPracticesData })),
      recordManualPractice: jest.fn().mockResolvedValue({ success: true }),
      pull: jest.fn().mockResolvedValue(undefined),
    }
  }
  return { default: mockFns, ...mockFns }
})

jest.mock('../../src/services/sanity.js', () => ({
  ...jest.requireActual('../../src/services/sanity.js'),
  fetchByRailContentIds: jest.fn(),
}))

jest.mock('../../src/services/contentAggregator.js', () => ({
  addContextToContent: jest.fn().mockResolvedValue([]),
}))

jest.mock('../../src/services/content-org/learning-paths.ts', () => ({
  mapContentsThatWereLastProgressedFromMethod: jest.fn((contents) => Promise.resolve(contents)),
}))

jest.mock('../../src/services/user/streakCalculator.ts', () => ({
  streakCalculator: {
    getStreakData: jest.fn().mockResolvedValue({
      currentDailyStreak: 0,
      currentWeeklyStreak: 0,
      streakMessage: '',
      calculatedAt: Date.now(),
      lastPracticeDate: null,
    }),
    invalidate: jest.fn(),
  }
}))

jest.mock('../../src/services/railcontent.js', () => ({
  ...jest.requireActual('../../src/services/railcontent'),
  logUserPractice: jest.fn(() => Promise.resolve()),
  fetchUserPermissionsData: jest.fn(() => ({ permissions: [78, 91, 92], isAdmin: false }))
}))

const repositoryProxy: any = require('../../src/services/sync/repository-proxy.ts')

describe('User Activity API Tests', function () {
  beforeEach(() => {
    initializeTestService()
    mockPracticesData = [
      { date: '2025-02-10', duration_seconds: 190 },
      { date: '2025-02-11', duration_seconds: 340 },
      { date: '2025-02-19', duration_seconds: 340 },
      { date: '2025-03-01', duration_seconds: 360 },
      { date: '2025-03-03', duration_seconds: 360 },
      { date: '2025-03-05', duration_seconds: 100 },
      { date: '2025-03-11', duration_seconds: 190 },
      { date: '2025-03-14', duration_seconds: 456 },
      { date: '2025-03-15', duration_seconds: 124 },
      { date: '2025-03-16', duration_seconds: 452 },
      { date: '2025-03-16', duration_seconds: 456 },
      { date: '2025-03-17', duration_seconds: 122 },
    ]
  })

  test('fetches user practices successfully', async () => {
    const practices = await getUserMonthlyStats()
    const dailyStats = practices.data.dailyActiveStats
    const currentDateString = new Date().toISOString().split('T')[0]

    const current = dailyStats.find(stat => stat.label === currentDateString)
    expect(current).toBeTruthy()
    expect(current.isActive).toBe(true)
    expect(current.type).toBe('active')
    expect(current.inStreak).toBe(false)
  })

  test('fetches user practices from past', async () => {
    const practices = await getUserMonthlyStats({ year: 2025, month: 1 })
    const dailyStats = practices.data.dailyActiveStats

    const feb10 = dailyStats.find(stat => stat.label === '2025-02-10')
    expect(feb10.inStreak).toBe(true)
    expect(feb10.type).toBe('tracked')
    expect(feb10.isActive).toBe(false)
  })

  test('fetches user practices for current week', async () => {
    const practices = await getUserWeeklyStats()
    const dailyStats = practices.data.dailyActiveStats

    const monday = dailyStats.find(stat => stat.label === 'M')
    expect(monday).toBeDefined()
    const tuesday = dailyStats.find(stat => stat.label === 'T')
    expect(tuesday).toBeDefined()
  })

  test('should add a new practice entry', async () => {
    const mockPractice = { duration_seconds: 300, content_id: 415183 }
    await recordUserPractice(mockPractice)

    expect(repositoryProxy.default.practices.recordManualPractice).toHaveBeenCalledWith(
      expect.any(String),
      300,
      { title: null, category_id: null, thumbnail_url: null, instrument_id: null }
    )
  })

  describe('getPracticeSessions', () => {
    test('returns all sessions unpaginated when limit is omitted', async () => {
      const result = await getPracticeSessions({ day: '2025-03-16' })

      expect(result.data.practices).toHaveLength(mockPracticesData.length)
      expect(result.data.total).toBe(mockPracticesData.length)
      expect(result.data.currentPage).toBe(1)
      expect(result.data.totalPages).toBe(1)
      expect(result.data.practiceDuration).toBe(
        mockPracticesData.reduce((sum, p) => sum + p.duration_seconds, 0)
      )
    })

    test('paginates when limit is provided', async () => {
      const result = await getPracticeSessions({ day: '2025-03-16', page: 2, limit: 5 })

      expect(result.data.practices).toHaveLength(5)
      expect(result.data.total).toBe(mockPracticesData.length)
      expect(result.data.currentPage).toBe(2)
      expect(result.data.totalPages).toBe(Math.ceil(mockPracticesData.length / 5))
      expect(result.data.practiceDuration).toBe(
        mockPracticesData.reduce((sum, p) => sum + p.duration_seconds, 0)
      )
    })

    test('returns an empty result when there are no sessions', async () => {
      mockPracticesData = []
      const result = await getPracticeSessions({ day: '2025-03-16' })

      expect(result.data).toEqual({
        practices: [],
        practiceDuration: 0,
        total: 0,
        currentPage: 1,
        totalPages: 1,
      })
    })
  })

  describe('getWeeklyPracticeSessions', () => {
    test('returns all sessions unpaginated when limit is omitted', async () => {
      const result = await getWeeklyPracticeSessions()

      expect(result.data.practices).toHaveLength(mockPracticesData.length)
      expect(result.data.total).toBe(mockPracticesData.length)
      expect(result.data.currentPage).toBe(1)
      expect(result.data.totalPages).toBe(1)
    })

    test('paginates when limit is provided', async () => {
      const result = await getWeeklyPracticeSessions({ page: 1, limit: 4 })

      expect(result.data.practices).toHaveLength(4)
      expect(result.data.total).toBe(mockPracticesData.length)
      expect(result.data.currentPage).toBe(1)
      expect(result.data.totalPages).toBe(Math.ceil(mockPracticesData.length / 4))
    })

    test('awaits the sync pull when options.pull is true', async () => {
      const result = await getWeeklyPracticeSessions({}, { pull: true })

      expect(result.data.total).toBe(mockPracticesData.length)
    })

    test('returns an empty result when there are no sessions', async () => {
      mockPracticesData = []
      const result = await getWeeklyPracticeSessions()

      expect(result.data).toEqual({
        practices: [],
        practiceDuration: 0,
        total: 0,
        currentPage: 1,
        totalPages: 1,
      })
    })
  })
})
