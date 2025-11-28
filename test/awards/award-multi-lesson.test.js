import { awardManager } from '../../src/services/awards/internal/award-manager'
import { awardEvents } from '../../src/services/awards/internal/award-events'
import { mockAwardDefinitions, getAwardByContentId } from '../mockData/award-definitions'

jest.mock('../../src/services/sanity', () => ({
  default: {
    fetch: jest.fn()
  },
  fetchSanity: jest.fn()
}))


jest.mock('../../src/services/sync/repository-proxy', () => {
  const mockFns = {
    contentProgress: {
      queryOne: jest.fn(),
      queryAll: jest.fn()
    },
    practices: {
      sumPracticeMinutesForContent: jest.fn()
    },
    userAwardProgress: {
      hasCompletedAward: jest.fn(),
      recordAwardProgress: jest.fn(),
      getByAwardId: jest.fn()
    }
  }
  return { default: mockFns, ...mockFns }
})

import sanityClient, { fetchSanity } from '../../src/services/sanity'
import db from '../../src/services/sync/repository-proxy'
import { awardDefinitions } from '../../src/services/awards/internal/award-definitions'

describe('Award Multi-Lesson Course Handling - E2E Scenarios', () => {
  let awardGrantedListener

  beforeEach(async () => {
    jest.clearAllMocks()
    awardEvents.removeAllListeners()

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)
    fetchSanity.mockResolvedValue(mockAwardDefinitions)

    db.practices.sumPracticeMinutesForContent = jest.fn().mockResolvedValue(200)
    db.userAwardProgress.hasCompletedAward = jest.fn().mockResolvedValue(false)
    db.userAwardProgress.recordAwardProgress = jest.fn().mockResolvedValue({ data: {}, status: 'synced' })

    db.contentProgress.queryAll.mockResolvedValue({
      data: [{ created_at: Math.floor(Date.now() / 1000) - 86400 * 10 }]
    })

    await awardDefinitions.refresh()

    awardGrantedListener = jest.fn()
  })

  afterEach(() => {
    awardEvents.removeAllListeners()
    awardDefinitions.clear()
  })

  describe('Scenario: Small course with 2 lessons (1 non-kickoff)', () => {
    const testAward = getAwardByContentId(416446)
    const courseId = 416446

    test('grants award when non-kickoff lesson completed', async () => {
      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
      })

      awardEvents.on('awardGranted', awardGrantedListener)

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        expect.any(String),
        100,
        expect.objectContaining({
          completedAt: expect.any(Number),
          completionData: expect.any(Object),
          progressData: expect.any(Object),
          immediate: true
        })
      )
      expect(awardGrantedListener).toHaveBeenCalledTimes(1)
    })

    test('shows 0% progress when only kickoff completed', async () => {
      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'started', created_at: Math.floor(Date.now() / 1000) }
      })

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        testAward._id,
        0,
        expect.objectContaining({
          progressData: expect.any(Object)
        })
      )
    })
  })

  describe('Scenario: Learning path with 22 lessons', () => {
    const testAward = getAwardByContentId(417140)
    const courseId = 417140

    test('grants award when all 22 lessons completed', async () => {
      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
      })

      awardEvents.on('awardGranted', awardGrantedListener)

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        expect.any(String),
        100,
        expect.objectContaining({
          completedAt: expect.any(Number),
          completionData: expect.any(Object),
          progressData: expect.any(Object),
          immediate: true
        })
      )
      expect(awardGrantedListener).toHaveBeenCalledTimes(1)
    })

    test('popup message says "learning path" not "guided course"', async () => {
      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
      })

      awardEvents.on('awardGranted', awardGrantedListener)

      await awardManager.onContentCompleted(courseId)

      const payload = awardGrantedListener.mock.calls[0][0]
      expect(payload.popupMessage).toContain('learning path')
      expect(payload.popupMessage).not.toContain('guided course')
    })
  })
})
