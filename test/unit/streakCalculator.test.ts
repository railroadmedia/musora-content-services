import { streakCalculator } from '../../src/services/user/streakCalculator'

let mockPracticeData: { id: string; date: string; duration_seconds: number }[] = []

jest.mock('../../src/services/sync/repository-proxy.ts', () => {
  const mockFns = {
    practices: {
      queryAll: jest.fn().mockImplementation(() => Promise.resolve({ data: mockPracticeData })),
      getAll: jest.fn().mockImplementation(() => Promise.resolve({ data: mockPracticeData })),
    },
  }
  return { default: mockFns, ...mockFns }
})

describe('streakCalculator reads the latest local practices', () => {
  beforeEach(() => {
    mockPracticeData = []
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-09-20T16:30:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('todaysPracticeSeconds includes practices synced from another device after an earlier read', async () => {
    const beforeSync = await streakCalculator.getStreakData()
    expect(beforeSync.todaysPracticeSeconds).toBe(0)

    mockPracticeData = [
      { id: 'web-1', date: '2026-09-20', duration_seconds: 288 },
      { id: 'web-2', date: '2026-09-20', duration_seconds: 598 },
    ]

    const afterSync = await streakCalculator.getStreakData()
    expect(afterSync.todaysPracticeSeconds).toBe(886)
  })

  test('lastPracticeDate moves to the new day once a practice is logged on it', async () => {
    mockPracticeData = [{ id: 'p-1', date: '2026-09-20', duration_seconds: 600 }]
    expect((await streakCalculator.getStreakData()).lastPracticeDate).toBe('2026-09-20')

    jest.setSystemTime(new Date('2026-09-21T09:00:00Z'))
    mockPracticeData.push({ id: 'p-2', date: '2026-09-21', duration_seconds: 300 })

    const nextDay = await streakCalculator.getStreakData()
    expect(nextDay.lastPracticeDate).toBe('2026-09-21')
    expect(nextDay.todaysPracticeSeconds).toBe(300)
  })
})
