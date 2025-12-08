import { mockAwardDefinitions } from '../mockData/award-definitions'

jest.mock('../../src/services/sanity', () => ({
  default: {
    fetch: jest.fn()
  },
  fetchSanity: jest.fn()
}))

jest.mock('../../src/services/sync/repository-proxy', () => {
  const mockFns = {
    userAwardProgress: {
      getAll: jest.fn(),
      getByAwardId: jest.fn()
    }
  }
  return { default: mockFns, ...mockFns }
})

import sanityClient, { fetchSanity } from '../../src/services/sanity'
import db from '../../src/services/sync/repository-proxy'
import { awardDefinitions } from '../../src/services/awards/internal/award-definitions'
import { getCompletedAwards, getInProgressAwards, getAwardStatistics } from '../../src/services/awards/award-query'

describe('Award User Collection - E2E Scenarios', () => {
  beforeEach(async () => {
    jest.clearAllMocks()

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)
    fetchSanity.mockResolvedValue(mockAwardDefinitions)
    db.userAwardProgress.getAll = jest.fn()
    db.userAwardProgress.getByAwardId = jest.fn()

    await awardDefinitions.refresh()
  })

  afterEach(() => {
    awardDefinitions.clear()
  })

  describe('Scenario: User with multiple completed awards', () => {
    beforeEach(() => {
      db.userAwardProgress.getAll.mockResolvedValue({
        data: [
          {
            award_id: '0238b1e5-ebee-42b3-9390-91467d113575',
            progress_percentage: 100,
            completed_at: Math.floor(Date.now() / 1000) - 86400 * 5,
            completion_data: {
              content_title: 'Adrian Guided Course Test',
              completed_at: new Date(Date.now() - 86400 * 5 * 1000).toISOString(),
              days_user_practiced: 14,
              practice_minutes: 180
            }
          },
          {
            award_id: '0f49cb6a-1b23-4628-968e-15df02ffad7f',
            progress_percentage: 100,
            completed_at: Math.floor(Date.now() / 1000) - 86400 * 2,
            completion_data: {
              content_title: 'Enrolling w/ Kickoff, has product GC (EC)',
              completed_at: new Date(Date.now() - 86400 * 2 * 1000).toISOString(),
              days_user_practiced: 10,
              practice_minutes: 200
            }
          },
          {
            award_id: '361f3034-c6c9-45f7-bbfb-0d58dbe14411',
            progress_percentage: 100,
            completed_at: Math.floor(Date.now() / 1000) - 86400 * 30,
            completion_data: {
              content_title: 'Learn To Play The Drums',
              completed_at: new Date(Date.now() - 86400 * 30 * 1000).toISOString(),
              days_user_practiced: 60,
              practice_minutes: 1200
            }
          }
        ]
      })
    })

    test('returns all completed awards with completion data', async () => {
      const completed = await getCompletedAwards()

      expect(completed).toHaveLength(3)
      expect(completed[0]).toMatchObject({
        awardId: '0f49cb6a-1b23-4628-968e-15df02ffad7f',
        awardTitle: 'Enrolling w/ Kickoff, has product GC (EC)',
        progressPercentage: 100,
        completedAt: expect.any(String),
        brand: 'pianote'
      })
    })

    test('completed awards include award definition details', async () => {
      const completed = await getCompletedAwards()

      expect(completed[0]).toMatchObject({
        badge: expect.stringContaining('cdn.sanity.io'),
        award: expect.stringContaining('cdn.sanity.io'),
        instructorName: 'Lisa Witt'
      })

      expect(completed[1]).toMatchObject({
        badge: expect.stringContaining('cdn.sanity.io'),
        award: expect.stringContaining('cdn.sanity.io'),
        instructorName: 'Aaron Graham'
      })
    })

    test('completed awards are sorted by completion date (most recent first)', async () => {
      const completed = await getCompletedAwards()

      const dates = completed.map(a => new Date(a.completedAt).getTime())
      expect(dates[0]).toBeGreaterThan(dates[1])
      expect(dates[1]).toBeGreaterThan(dates[2])
    })
  })

  describe('Scenario: User with in-progress awards', () => {
    beforeEach(() => {
      db.userAwardProgress.getAll.mockResolvedValue({
        data: [
          {
            award_id: '0238b1e5-ebee-42b3-9390-91467d113575',
            progress_percentage: 50,
            completed_at: null,
            completion_data: null
          },
          {
            award_id: '0f49cb6a-1b23-4628-968e-15df02ffad7f',
            progress_percentage: 75,
            completed_at: null,
            completion_data: null
          },
          {
            award_id: '361f3034-c6c9-45f7-bbfb-0d58dbe14411',
            progress_percentage: 20,
            completed_at: null,
            completion_data: null
          }
        ]
      })
    })

    test('returns all in-progress awards with progress percentages', async () => {
      const inProgress = await getInProgressAwards()

      expect(inProgress).toHaveLength(3)
      expect(inProgress[0]).toMatchObject({
        awardId: '0f49cb6a-1b23-4628-968e-15df02ffad7f',
        progressPercentage: 75,
        completedAt: null
      })
    })

    test('in-progress awards include award definition details', async () => {
      const inProgress = await getInProgressAwards()

      expect(inProgress[0]).toMatchObject({
        awardTitle: 'Enrolling w/ Kickoff, has product GC (EC)',
        badge: expect.stringContaining('cdn.sanity.io'),
        brand: 'pianote'
      })
    })

    test('in-progress awards are sorted by progress percentage (highest first)', async () => {
      const inProgress = await getInProgressAwards()

      expect(inProgress[0].progressPercentage).toBe(75)
      expect(inProgress[1].progressPercentage).toBe(50)
      expect(inProgress[2].progressPercentage).toBe(20)
    })
  })

  describe('Scenario: User with mixed completed and in-progress awards', () => {
    beforeEach(() => {
      db.userAwardProgress.getAll.mockResolvedValue({
        data: [
          {
            award_id: '0238b1e5-ebee-42b3-9390-91467d113575',
            progress_percentage: 100,
            completed_at: Math.floor(Date.now() / 1000) - 86400,
            completion_data: {
              content_title: 'Adrian Guided Course Test',
              completed_at: new Date(Date.now() - 86400 * 1000).toISOString(),
              days_user_practiced: 14,
              practice_minutes: 180
            }
          },
          {
            award_id: '0f49cb6a-1b23-4628-968e-15df02ffad7f',
            progress_percentage: 60,
            completed_at: null,
            completion_data: null
          },
          {
            award_id: '361f3034-c6c9-45f7-bbfb-0d58dbe14411',
            progress_percentage: 100,
            completed_at: Math.floor(Date.now() / 1000) - 86400 * 10,
            completion_data: {
              content_title: 'Learn To Play The Drums',
              completed_at: new Date(Date.now() - 86400 * 10 * 1000).toISOString(),
              days_user_practiced: 60,
              practice_minutes: 1200
            }
          }
        ]
      })
    })

    test('getCompletedAwards only returns completed awards', async () => {
      const completed = await getCompletedAwards()

      expect(completed).toHaveLength(2)
      expect(completed.every(a => a.progressPercentage === 100)).toBe(true)
      expect(completed.every(a => a.completedAt !== null)).toBe(true)
    })

    test('getInProgressAwards only returns in-progress awards', async () => {
      const inProgress = await getInProgressAwards()

      expect(inProgress).toHaveLength(1)
      expect(inProgress[0].progressPercentage).toBe(60)
      expect(inProgress[0].completedAt).toBeNull()
    })

    test('calculates correct statistics', async () => {
      const stats = await getAwardStatistics()

      expect(stats).toMatchObject({
        totalAvailable: mockAwardDefinitions.length,
        completed: 2,
        inProgress: 1,
        notStarted: mockAwardDefinitions.length - 3,
        completionPercentage: expect.any(Number)
      })

      expect(stats.completionPercentage).toBeCloseTo((2 / mockAwardDefinitions.length) * 100, 1)
    })
  })

  describe('Scenario: Brand-specific award filtering', () => {
    beforeEach(() => {
      db.userAwardProgress.getAll.mockResolvedValue({
        data: [
          {
            award_id: '0238b1e5-ebee-42b3-9390-91467d113575',
            progress_percentage: 100,
            completed_at: Math.floor(Date.now() / 1000),
            completion_data: {
              content_title: 'Adrian Guided Course Test',
              completed_at: new Date().toISOString(),
              days_user_practiced: 14,
              practice_minutes: 180
            }
          },
          {
            award_id: '0f49cb6a-1b23-4628-968e-15df02ffad7f',
            progress_percentage: 100,
            completed_at: Math.floor(Date.now() / 1000),
            completion_data: {
              content_title: 'Enrolling w/ Kickoff, has product GC (EC)',
              completed_at: new Date().toISOString(),
              days_user_practiced: 60,
              practice_minutes: 1200
            }
          }
        ]
      })
    })

    test('filters completed awards by brand', async () => {
      const drumeoAwards = await getCompletedAwards('drumeo')

      expect(drumeoAwards).toHaveLength(1)
      expect(drumeoAwards.every(a => a.brand === 'drumeo')).toBe(true)
    })

    test('returns empty array for brand with no awards', async () => {
      const singeoAwards = await getCompletedAwards('singeo')

      expect(singeoAwards).toHaveLength(0)
    })

    test('calculates brand-specific statistics including completed count', async () => {
      const drumeoStats = await getAwardStatistics('drumeo')
      const drumeoAwardsCount = mockAwardDefinitions.filter(a => a.brand === 'drumeo').length

      expect(drumeoStats.totalAvailable).toBe(drumeoAwardsCount)
      expect(drumeoStats.completed).toBe(1)

      const pianoteStats = await getAwardStatistics('pianote')
      const pianoteAwardsCount = mockAwardDefinitions.filter(a => a.brand === 'pianote').length

      expect(pianoteStats.totalAvailable).toBe(pianoteAwardsCount)
      expect(pianoteStats.completed).toBe(1)
    })
  })

  describe('Scenario: New user with no awards', () => {
    beforeEach(() => {
      db.userAwardProgress.getAll.mockResolvedValue({
        data: []
      })
    })

    test('getCompletedAwards returns empty array', async () => {
      const completed = await getCompletedAwards()

      expect(completed).toHaveLength(0)
    })

    test('getInProgressAwards returns empty array', async () => {
      const inProgress = await getInProgressAwards()

      expect(inProgress).toHaveLength(0)
    })

    test('statistics show all awards as not started', async () => {
      const stats = await getAwardStatistics()

      expect(stats).toMatchObject({
        totalAvailable: mockAwardDefinitions.length,
        completed: 0,
        inProgress: 0,
        notStarted: mockAwardDefinitions.length,
        completionPercentage: 0
      })
    })
  })

  describe('Scenario: Award collection pagination', () => {
    beforeEach(() => {
      const availableAwardIds = mockAwardDefinitions.map(a => a._id)
      const manyAwards = availableAwardIds.slice(0, Math.min(20, availableAwardIds.length)).map((id, i) => ({
        award_id: id,
        progress_percentage: 100,
        completed_at: Math.floor(Date.now() / 1000) - 86400 * i,
        completion_data: {
          content_title: `Course ${i}`,
          completed_at: new Date(Date.now() - 86400 * i * 1000).toISOString(),
          days_user_practiced: 10,
          practice_minutes: 100
        }
      }))

      db.userAwardProgress.getAll.mockResolvedValue({
        data: manyAwards
      })
    })

    test('supports limit parameter for completed awards', async () => {
      const completed = await getCompletedAwards(null, { limit: 5 })

      expect(completed.length).toBeLessThanOrEqual(5)
    })

    test('supports offset parameter for completed awards', async () => {
      const firstPage = await getCompletedAwards(null, { limit: 3, offset: 0 })
      const secondPage = await getCompletedAwards(null, { limit: 3, offset: 3 })

      expect(firstPage).toHaveLength(3)
      expect(secondPage).toHaveLength(3)
      expect(firstPage[0].awardId).not.toBe(secondPage[0].awardId)
    })
  })

  describe('Scenario: Award with missing definition', () => {
    beforeEach(() => {
      db.userAwardProgress.getAll.mockResolvedValue({
        data: [
          {
            award_id: '0238b1e5-ebee-42b3-9390-91467d113575',
            progress_percentage: 100,
            completed_at: Math.floor(Date.now() / 1000),
            completion_data: {
              content_title: 'Adrian Guided Course Test',
              completed_at: new Date().toISOString(),
              days_user_practiced: 14,
              practice_minutes: 180
            }
          },
          {
            award_id: 'non-existent-award-id',
            progress_percentage: 100,
            completed_at: Math.floor(Date.now() / 1000),
            completion_data: {
              content_title: 'Deleted Course',
              completed_at: new Date().toISOString(),
              days_user_practiced: 5,
              practice_minutes: 50
            }
          }
        ]
      })
    })

    test('filters out awards with missing definitions', async () => {
      const completed = await getCompletedAwards()

      expect(completed).toHaveLength(1)
      expect(completed[0].awardId).toBe('0238b1e5-ebee-42b3-9390-91467d113575')
    })

    test('statistics only count awards with valid definitions', async () => {
      const stats = await getAwardStatistics()

      expect(stats.completed).toBe(1)
    })
  })
})
