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

describe('Award Completion Flow - E2E Scenarios', () => {
  let awardGrantedListener
  const testAward = getAwardByContentId(416446)
  const courseId = 416446

  beforeEach(async () => {
    jest.clearAllMocks()
    awardEvents.removeAllListeners()

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)
    fetchSanity.mockResolvedValue(mockAwardDefinitions)

    db.practices.sumPracticeMinutesForContent = jest.fn().mockResolvedValue(180)
    db.userAwardProgress.hasCompletedAward = jest.fn().mockResolvedValue(false)
    db.userAwardProgress.recordAwardProgress = jest.fn().mockResolvedValue({ data: {}, status: 'synced' })

    await awardDefinitions.refresh()

    awardGrantedListener = jest.fn()
  })

  afterEach(() => {
    awardEvents.removeAllListeners()
    awardDefinitions.clear()
  })

  describe('Scenario: User completes all lessons in course', () => {
    beforeEach(() => {
      db.contentProgress.queryOne.mockResolvedValue({
        data: {
          state: 'completed',
          created_at: Math.floor(Date.now() / 1000) - 86400 * 14
        }
      })

      db.contentProgress.queryAll.mockResolvedValue({
        data: [{ created_at: Math.floor(Date.now() / 1000) - 86400 * 14 }]
      })
    })

    test('award is granted with 100% progress', async () => {
      awardEvents.on('awardGranted', awardGrantedListener)

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        testAward._id,
        100,
        expect.objectContaining({
          completedAt: expect.any(Number),
          completionData: expect.objectContaining({
            content_title: expect.any(String),
            days_user_practiced: expect.any(Number),
            practice_minutes: 180
          }),
          progressData: expect.any(Object),
          immediate: true
        })
      )

      expect(awardGrantedListener).toHaveBeenCalledTimes(1)
    })

    test('awardGranted event contains complete payload', async () => {
      awardEvents.on('awardGranted', awardGrantedListener)

      await awardManager.onContentCompleted(courseId)

      const payload = awardGrantedListener.mock.calls[0][0]

      expect(payload).toMatchObject({
        awardId: testAward._id,
        definition: expect.objectContaining({
          name: testAward.name,
          badge: testAward.badge,
          award: testAward.award
        }),
        completionData: expect.objectContaining({
          content_title: expect.any(String),
          days_user_practiced: expect.any(Number),
          practice_minutes: 180
        }),
        popupMessage: expect.stringContaining('Adrian Guided Course Test'),
        timestamp: expect.any(Number)
      })
    })

    test('popup message contains correct practice data', async () => {
      awardEvents.on('awardGranted', awardGrantedListener)

      await awardManager.onContentCompleted(courseId)

      const payload = awardGrantedListener.mock.calls[0][0]

      expect(payload.popupMessage).toContain('180 minutes')
      expect(payload.popupMessage).toContain('Adrian Guided Course Test')
    })

    test('award is immediately synced to backend', async () => {
      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        testAward._id,
        100,
        expect.objectContaining({
          completedAt: expect.any(Number),
          immediate: true
        })
      )
    })

    test('multiple event listeners all receive notification', async () => {
      const listener1 = jest.fn()
      const listener2 = jest.fn()
      const listener3 = jest.fn()

      awardEvents.on('awardGranted', listener1)
      awardEvents.on('awardGranted', listener2)
      awardEvents.on('awardGranted', listener3)

      await awardManager.onContentCompleted(courseId)

      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).toHaveBeenCalledTimes(1)
      expect(listener3).toHaveBeenCalledTimes(1)

      const payload1 = listener1.mock.calls[0][0]
      const payload2 = listener2.mock.calls[0][0]
      expect(payload1.awardId).toBe(payload2.awardId)
    })
  })

  describe('Scenario: Parent course completed but children incomplete', () => {
    const multiLessonAward = { _id: '0f49cb6a-1b23-4628-968e-15df02ffad7f', child_ids: [417045, 417046, 417047, 417048] }
    const parentCourseId = 417049

    test('does not grant award when parent completed but only 2 of 4 children completed', async () => {
      const completedLessonIds = [417045, 417046]

      db.contentProgress.queryOne.mockImplementation((whereClause) => {
        const contentId = whereClause?.comparison?.right?.value

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      db.contentProgress.queryAll.mockResolvedValue({
        data: [{ created_at: Math.floor(Date.now() / 1000) }]
      })

      awardEvents.on('awardGranted', awardGrantedListener)

      await awardManager.onContentCompleted(parentCourseId)

      expect(awardGrantedListener).not.toHaveBeenCalled()
      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        multiLessonAward._id,
        50,
        expect.objectContaining({
          progressData: expect.any(Object)
        })
      )
    })

    test('emits awardProgress event with partial progress when parent completed', async () => {
      const progressListener = jest.fn()
      const completedLessonIds = [417045, 417046]

      db.contentProgress.queryOne.mockImplementation((whereClause) => {
        const contentId = whereClause?.comparison?.right?.value

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      db.contentProgress.queryAll.mockResolvedValue({
        data: [{ created_at: Math.floor(Date.now() / 1000) }]
      })

      awardEvents.on('awardProgress', progressListener)

      await awardManager.onContentCompleted(parentCourseId)

      expect(progressListener).toHaveBeenCalledWith(
        expect.objectContaining({
          awardId: multiLessonAward._id,
          progressPercentage: 50,
          timestamp: expect.any(Number)
        })
      )
    })
  })

  describe('Scenario: Content has no associated award', () => {
    test('completes gracefully without errors', async () => {
      const nonExistentCourseId = 999999

      await expect(
        awardManager.onContentCompleted(nonExistentCourseId)
      ).resolves.not.toThrow()

      expect(awardGrantedListener).not.toHaveBeenCalled()
    })
  })

  describe('Scenario: User already earned the award', () => {
    beforeEach(() => {
      db.userAwardProgress.hasCompletedAward.mockResolvedValue(true)

      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
      })
    })

    test('does not grant award again', async () => {
      awardEvents.on('awardGranted', awardGrantedListener)

      await awardManager.onContentCompleted(courseId)

      expect(awardGrantedListener).not.toHaveBeenCalled()
    })

    test('does not update progress', async () => {
      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).not.toHaveBeenCalled()
    })
  })
})
