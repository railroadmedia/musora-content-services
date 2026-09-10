import { streakCalculator } from '../../src/services/user/streakCalculator'

let mockPracticeData: { date: string; duration_seconds: number }[] = []

jest.mock('../../src/services/sync/repository-proxy.ts', () => {
  const mockFns = {
    practices: {
      queryAll: jest.fn().mockImplementation(() => Promise.resolve({ data: mockPracticeData })),
      getAll: jest.fn().mockImplementation(() => Promise.resolve({ data: mockPracticeData })),
    },
  }
  return { default: mockFns, ...mockFns }
})

describe('BR-717: streak cache does not expire at the day boundary', () => {
  beforeEach(() => {
    streakCalculator.invalidate()
    mockPracticeData = []
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('getStreakData() should recalculate once a new day starts, even with no explicit invalidate() call', async () => {
    jest.setSystemTime(new Date('2026-09-08T20:00:00Z'))
    mockPracticeData = [{ date: '2026-09-08', duration_seconds: 600 }]

    const day1 = await streakCalculator.getStreakData()
    expect(day1.lastPracticeDate).toBe('2026-09-08')

    // A new calendar day starts. In production, nothing calls streakCalculator.invalidate()
    // on a date rollover — only explicit practice mutations do (recordUserPractice, etc.).
    // We deliberately do NOT call invalidate() here either, to reproduce exactly what
    // happens on a normal "reopen the app the next day" with no new practice logged yet.
    const day2SystemTime = new Date('2026-09-09T09:00:00Z')
    jest.setSystemTime(day2SystemTime)

    const day2 = await streakCalculator.getStreakData()

    // Expected: a new day should trigger a fresh recalculation, not the stale day1 cache.
    expect(day2.calculatedAt).toBe(day2SystemTime.getTime())
    expect(day2.calculatedAt).toBeGreaterThan(day1.calculatedAt)
  })
})
