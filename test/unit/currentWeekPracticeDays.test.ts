import { initializeTestService } from '../initializeTests.js'
import { getUserWeeklyStats } from '../../src/services/userActivity.js'
import { streakCalculator } from '../../src/services/user/streakCalculator'

let mockPracticeData: { date: string; duration_seconds: number }[] = []

// Mimics WatermelonDB's real query filtering for the one clause shape this
// codepath actually uses (Q.where('date', Q.oneOf(dates))), since the real
// adapter isn't available in this unit test environment.
const applyDateOneOfFilter = (data: typeof mockPracticeData, clauses: any[]) => {
  const dateClause = clauses.find((c) => c?.type === 'where' && c?.left === 'date')
  const allowedDates: string[] | undefined = dateClause?.comparison?.right?.values
  if (!allowedDates) {
    return data
  }
  return data.filter((d) => allowedDates.includes(d.date))
}

jest.mock('../../src/services/sync/repository-proxy.ts', () => {
  const mockFns = {
    practices: {
      queryAll: jest
        .fn()
        .mockImplementation((...clauses: any[]) =>
          Promise.resolve({ data: applyDateOneOfFilter(mockPracticeData, clauses) })
        ),
      getAll: jest.fn().mockImplementation(() => Promise.resolve({ data: mockPracticeData })),
    },
  }
  return { default: mockFns, ...mockFns }
})

describe('currentWeekPracticeDays', () => {
  beforeEach(() => {
    initializeTestService()
    mockPracticeData = []
    // Tuesday, so only Monday + today have legitimately elapsed this week
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-09-22T12:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('ignores practice dates beyond the end of the current week', async () => {
    mockPracticeData = [
      { date: '2026-09-21', duration_seconds: 60 }, // Monday, this week
      { date: '2026-09-22', duration_seconds: 60 }, // Tuesday, today
      { date: '2026-09-28', duration_seconds: 60 }, // next week - must not count
      { date: '2032-08-25', duration_seconds: 60 }, // far future garbage row - must not count
    ]
    streakCalculator.invalidate()

    const stats = await getUserWeeklyStats()

    expect(stats.data.currentWeekPracticeDays).toBe(2)
  })

  test('ignores practice dates later this same week that have not happened yet', async () => {
    mockPracticeData = [
      { date: '2026-09-21', duration_seconds: 60 }, // Monday, this week
      { date: '2026-09-22', duration_seconds: 60 }, // Tuesday, today
      { date: '2026-09-25', duration_seconds: 60 }, // Friday, still this week, but in the future
    ]
    streakCalculator.invalidate()

    const stats = await getUserWeeklyStats()

    expect(stats.data.currentWeekPracticeDays).toBe(2)
  })

  test('counts a single practice made today as one day, not zero', async () => {
    mockPracticeData = [{ date: '2026-09-22', duration_seconds: 60 }]
    streakCalculator.invalidate()

    const stats = await getUserWeeklyStats()

    expect(stats.data.currentWeekPracticeDays).toBe(1)
    expect(stats.data.todaysPracticeSeconds).toBe(60)
  })

  test('excludes practice dates from previous weeks', async () => {
    mockPracticeData = [
      { date: '2026-09-14', duration_seconds: 60 }, // Monday, last week
      { date: '2026-09-20', duration_seconds: 60 }, // Sunday, last week
      { date: '2026-09-21', duration_seconds: 60 }, // Monday, this week
    ]
    streakCalculator.invalidate()

    const stats = await getUserWeeklyStats()

    expect(stats.data.currentWeekPracticeDays).toBe(1)
  })
})
