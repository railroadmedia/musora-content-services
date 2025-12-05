import { awardManager } from '../../src/services/awards/internal/award-manager'
import { awardEvents } from '../../src/services/awards/internal/award-events'
import { mockAwardDefinitions, getAwardByContentId } from '../mockData/award-definitions'
import { setupDefaultMocks, setupAwardEventListeners } from './helpers'
import { mockCompletionStates, mockAllCompleted, mockNoneCompleted } from './helpers/completion-mock'

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

describe('Award Progress Calculation', () => {
  let listeners

  beforeEach(async () => {
    jest.clearAllMocks()
    awardEvents.removeAllListeners()

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)
    setupDefaultMocks(db, fetchSanity, { practiceMinutes: 120 })

    db.contentProgress.getSomeProgressByContentIds.mockResolvedValue({
      data: [{ created_at: Math.floor(Date.now() / 1000) - 86400 * 5 }]
    })

    await awardDefinitions.refresh()

    listeners = setupAwardEventListeners(awardEvents)
  })

  afterEach(() => {
    awardEvents.removeAllListeners()
    awardDefinitions.clear()
  })

  describe('Single lesson course (content_id: 416446, child_ids: [416448])', () => {
    const award = getAwardByContentId(416446)
    const childId = 416448

    test('grants award at 100% when the single lesson is completed', async () => {
      mockAllCompleted(db)

      await awardManager.onContentCompleted(childId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        award._id,
        100,
        expect.objectContaining({
          completedAt: expect.any(Number),
          completionData: expect.objectContaining({
            content_title: award.content_title,
            days_user_practiced: expect.any(Number),
            practice_minutes: expect.any(Number)
          }),
          progressData: {
            completedLessonIds: [childId],
            totalLessons: 1,
            completedCount: 1
          },
          immediate: true
        })
      )
      expect(listeners.granted).toHaveBeenCalledTimes(1)
    })

    test('records 0% progress when the lesson is not completed', async () => {
      mockNoneCompleted(db)

      await awardManager.onContentCompleted(childId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        award._id,
        0,
        expect.objectContaining({
          progressData: {
            completedLessonIds: [],
            totalLessons: 1,
            completedCount: 0
          }
        })
      )
      expect(listeners.granted).not.toHaveBeenCalled()
    })
  })

  describe('10-lesson course (content_id: 416450, child_ids: 10 lessons)', () => {
    const award = getAwardByContentId(416450)
    const childIds = award.child_ids

    test('calculates 50% progress when 5 of 10 lessons are completed', async () => {
      mockCompletionStates(db, childIds.slice(0, 5))

      await awardManager.onContentCompleted(childIds[0])

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        award._id,
        50,
        expect.objectContaining({
          progressData: expect.objectContaining({
            totalLessons: 10,
            completedCount: 5
          })
        })
      )
    })

    test('calculates 90% progress when 9 of 10 lessons are completed', async () => {
      mockCompletionStates(db, childIds.slice(0, 9))

      await awardManager.onContentCompleted(childIds[0])

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        award._id,
        90,
        expect.objectContaining({
          progressData: expect.objectContaining({
            totalLessons: 10,
            completedCount: 9
          })
        })
      )
      expect(listeners.granted).not.toHaveBeenCalled()
    })

    test('grants award when all 10 lessons are completed', async () => {
      mockAllCompleted(db)

      await awardManager.onContentCompleted(childIds[0])

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        award._id,
        100,
        expect.objectContaining({
          completedAt: expect.any(Number),
          progressData: expect.objectContaining({
            totalLessons: 10,
            completedCount: 10
          }),
          immediate: true
        })
      )
      expect(listeners.granted).toHaveBeenCalledTimes(1)
    })
  })

  describe('22-lesson learning path (content_id: 417140)', () => {
    const award = getAwardByContentId(417140)
    const childIds = award.child_ids

    test('calculates correct percentage for partial completion (11/22 = 50%)', async () => {
      mockCompletionStates(db, childIds.slice(0, 11))

      await awardManager.onContentCompleted(childIds[0])

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        award._id,
        50,
        expect.objectContaining({
          progressData: expect.objectContaining({
            totalLessons: 22,
            completedCount: 11
          })
        })
      )
    })

    test('does not grant award when 21 of 22 lessons completed (95%)', async () => {
      mockCompletionStates(db, childIds.slice(0, 21))

      await awardManager.onContentCompleted(childIds[0])

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        award._id,
        95,
        expect.objectContaining({
          progressData: expect.objectContaining({
            totalLessons: 22,
            completedCount: 21
          })
        })
      )
      expect(listeners.granted).not.toHaveBeenCalled()
    })

    test('grants award with correct popup message when all 22 lessons completed', async () => {
      mockAllCompleted(db)

      await awardManager.onContentCompleted(childIds[0])

      expect(listeners.granted).toHaveBeenCalledTimes(1)

      const payload = listeners.granted.mock.calls[0][0]
      expect(payload.awardId).toBe(award._id)
      expect(payload.popupMessage).toContain(award.content_title)
      expect(payload.popupMessage).toContain('120 minutes')
      expect(payload.completionData).toEqual(expect.objectContaining({
        content_title: award.content_title,
        practice_minutes: 120
      }))
    })
  })

  describe('Award already completed', () => {
    const award = getAwardByContentId(416446)
    const childId = 416448

    test('skips evaluation when award is already completed', async () => {
      db.userAwardProgress.hasCompletedAward.mockResolvedValue(true)
      mockAllCompleted(db)

      await awardManager.onContentCompleted(childId)

      expect(db.userAwardProgress.recordAwardProgress).not.toHaveBeenCalled()
      expect(listeners.granted).not.toHaveBeenCalled()
    })
  })
})
