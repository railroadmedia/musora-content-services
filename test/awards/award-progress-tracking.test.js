import { awardManager } from '../../src/services/awards/award-manager'
import { awardEvents } from '../../src/services/awards/award-events'
import { mockAwardDefinitions, getAwardByContentId } from '../mockData/award-definitions'

jest.mock('../../src/services/sanity', () => ({
  default: {
    fetch: jest.fn()
  }
}))


jest.mock('../../src/services/sync/repository-proxy', () => {
  const mockFns = {
    contentProgress: {
      queryOne: jest.fn(),
      queryAll: jest.fn()
    },
    contentPractices: {
      sumPracticeMinutesForContent: jest.fn()
    },
    userAwardProgress: {
      hasCompletedAward: jest.fn(),
      recordAwardProgress: jest.fn(),
      completeAward: jest.fn(),
      getByAwardId: jest.fn()
    }
  }
  return { default: mockFns, ...mockFns }
})

import sanityClient from '../../src/services/sanity'
import db from '../../src/services/sync/repository-proxy'
import { awardDefinitions } from '../../src/services/awards/award-definitions'

describe('Award Progress Tracking - E2E Scenarios', () => {
  const testAward = getAwardByContentId(417049)
  const courseId = 417049

  beforeEach(async () => {
    jest.clearAllMocks()
    awardEvents.removeAllListeners()

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)

    db.contentPractices.sumPracticeMinutesForContent = jest.fn().mockResolvedValue(180)
    db.userAwardProgress.hasCompletedAward = jest.fn().mockResolvedValue(false)
    db.userAwardProgress.recordAwardProgress = jest.fn().mockResolvedValue({ data: {}, status: 'synced' })
    db.userAwardProgress.completeAward = jest.fn().mockResolvedValue({ data: {}, status: 'synced' })

    db.contentProgress.queryAll = jest.fn().mockResolvedValue({
      data: [{ created_at: Math.floor(Date.now() / 1000) - 86400 * 10 }]
    })

    await awardDefinitions.refresh()
  })

  afterEach(() => {
    awardDefinitions.clear()
  })

  test('placeholder test for progress tracking', () => {
    expect(testAward).toBeDefined()
    expect(courseId).toBe(417049)
  })
})