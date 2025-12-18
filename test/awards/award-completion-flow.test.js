import { awardManager } from '../../src/services/awards/internal/award-manager'
import { awardEvents } from '../../src/services/awards/internal/award-events'
import { mockAwardDefinitions, getAwardByContentId } from '../mockData/award-definitions'
import { setupDefaultMocks, setupAwardEventListeners } from './helpers'
import { mockCompletionStates, mockAllCompleted } from './helpers/completion-mock'

jest.mock('../../src/services/sanity', () => ({
  default: { fetch: jest.fn() },
  fetchSanity: jest.fn()
}))

jest.mock('../../src/services/sync/repository-proxy', () => {
  const mockFns = {
    contentProgress: {
      getOneProgressByContentId: jest.fn(),
      getSomeProgressByContentIds: jest.fn(),
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
  let listeners
  const testAward = getAwardByContentId(416446)
  const courseId = 416446

  beforeEach(async () => {
    jest.clearAllMocks()
    awardEvents.removeAllListeners()

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)
    setupDefaultMocks(db, fetchSanity, { practiceMinutes: 180 })

    await awardDefinitions.refresh()

    listeners = setupAwardEventListeners(awardEvents)
  })

  afterEach(() => {
    awardEvents.removeAllListeners()
    awardDefinitions.clear()
  })

  describe('Scenario: User completes all lessons in course', () => {
    beforeEach(() => {
      mockAllCompleted(db)
    })

    test('award is granted with 100% progress', async () => {
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

      expect(listeners.granted).toHaveBeenCalledTimes(1)
    })

    test('awardGranted event contains complete payload', async () => {
      await awardManager.onContentCompleted(courseId)

      const payload = listeners.granted.mock.calls[0][0]

      expect(payload).toMatchObject({
        awardId: testAward._id,
        definition: expect.objectContaining({
          name: testAward.name,
          badge: testAward.badge,
          award: testAward.award,
          content_type: expect.any(String)
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
      await awardManager.onContentCompleted(courseId)

      const payload = listeners.granted.mock.calls[0][0]

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
    const multiLessonAward = getAwardByContentId(417049)
    const parentCourseId = 417049

    test('does not grant award when parent completed but only 2 of 4 children completed', async () => {
      mockCompletionStates(db, [417045, 417046])

      await awardManager.onContentCompleted(parentCourseId)

      expect(listeners.granted).not.toHaveBeenCalled()
      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        multiLessonAward._id,
        50,
        expect.objectContaining({
          progressData: expect.any(Object)
        })
      )
    })

    test('emits awardProgress event with partial progress when parent completed', async () => {
      mockCompletionStates(db, [417045, 417046])

      await awardManager.onContentCompleted(parentCourseId)

      expect(listeners.progress).toHaveBeenCalledWith(
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

      expect(listeners.granted).not.toHaveBeenCalled()
    })
  })

  describe('Scenario: User already earned the award', () => {
    beforeEach(() => {
      db.userAwardProgress.hasCompletedAward.mockResolvedValue(true)
      mockAllCompleted(db)
    })

    test('does not grant award again', async () => {
      await awardManager.onContentCompleted(courseId)

      expect(listeners.granted).not.toHaveBeenCalled()
    })

    test('does not update progress', async () => {
      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).not.toHaveBeenCalled()
    })
  })

  describe('Scenario: Race condition - eligibility check fails but progress reaches 100%', () => {
    const multiLessonAward = getAwardByContentId(417049)
    const parentCourseId = 417049

    test('grants award with completedAt when updateAwardProgress calculates 100%', async () => {
      let callCount = 0

      db.contentProgress.getSomeProgressByContentIds.mockImplementation((contentIds) => {
        callCount++

        if (callCount === 1) {
          const partialRecords = contentIds
            .filter(id => [417045, 417046, 417047].includes(id))
            .map(id => ({
              content_id: id,
              state: 'completed',
              created_at: Math.floor(Date.now() / 1000)
            }))
          return Promise.resolve({ data: partialRecords })
        }

        const allRecords = contentIds.map(id => ({
          content_id: id,
          state: 'completed',
          created_at: Math.floor(Date.now() / 1000)
        }))
        return Promise.resolve({ data: allRecords })
      })

      await awardManager.onContentCompleted(parentCourseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        multiLessonAward._id,
        100,
        expect.objectContaining({
          completedAt: expect.any(Number),
          completionData: expect.objectContaining({
            completed_at: expect.any(String)
          }),
          immediate: true
        })
      )

      expect(listeners.granted).toHaveBeenCalledTimes(1)
      expect(listeners.progress).not.toHaveBeenCalled()
    })

    test('emits awardGranted event when race condition triggers completion', async () => {
      let callCount = 0

      db.contentProgress.getSomeProgressByContentIds.mockImplementation((contentIds) => {
        callCount++

        if (callCount === 1) {
          const partialRecords = contentIds
            .filter(id => [417045, 417046].includes(id))
            .map(id => ({
              content_id: id,
              state: 'completed',
              created_at: Math.floor(Date.now() / 1000)
            }))
          return Promise.resolve({ data: partialRecords })
        }

        const allRecords = contentIds.map(id => ({
          content_id: id,
          state: 'completed',
          created_at: Math.floor(Date.now() / 1000)
        }))
        return Promise.resolve({ data: allRecords })
      })

      await awardManager.onContentCompleted(parentCourseId)

      expect(listeners.granted).toHaveBeenCalledTimes(1)
      expect(listeners.granted).toHaveBeenCalledWith(
        expect.objectContaining({
          awardId: multiLessonAward._id,
          definition: expect.objectContaining({
            name: multiLessonAward.name
          }),
          completionData: expect.objectContaining({
            completed_at: expect.any(String)
          }),
          timestamp: expect.any(Number)
        })
      )
    })
  })
})
