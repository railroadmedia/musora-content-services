import { contentProgressObserver } from '../../src/services/awards/internal/content-progress-observer'
import { awardEvents } from '../../src/services/awards/internal/award-events'
import { emitProgressSaved } from '../../src/services/progress-events'
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

describe('Award Observer Integration - E2E Scenarios', () => {
  let awardProgressListener
  let awardGrantedListener

  const emitProgressWithCollection = (contentId, collectionType, collectionId, progressPercent = 100) => {
    emitProgressSaved({
      userId: 123,
      contentId,
      progressPercent,
      progressStatus: progressPercent === 100 ? 'completed' : 'started',
      bubble: true,
      collectionType,
      collectionId,
      resumeTimeSeconds: null,
      timestamp: Date.now()
    })
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    awardEvents.removeAllListeners()

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)
    fetchSanity.mockResolvedValue(mockAwardDefinitions)

    db.practices.sumPracticeMinutesForContent = jest.fn().mockResolvedValue(200)
    db.userAwardProgress.hasCompletedAward = jest.fn().mockResolvedValue(false)
    db.userAwardProgress.recordAwardProgress = jest.fn().mockResolvedValue({ data: {}, status: 'synced' })

    db.contentProgress.queryAll = jest.fn().mockResolvedValue({
      data: [{ created_at: Math.floor(Date.now() / 1000) - 86400 * 10 }]
    })
    db.contentProgress.queryOne = jest.fn().mockResolvedValue({
      data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
    })

    await awardDefinitions.refresh()

    awardProgressListener = jest.fn()
    awardGrantedListener = jest.fn()
    awardEvents.on('awardProgress', awardProgressListener)
    awardEvents.on('awardGranted', awardGrantedListener)

    await contentProgressObserver.start()
  })

  afterEach(() => {
    awardEvents.removeAllListeners()
    awardDefinitions.clear()
    contentProgressObserver.stop()
  })

  describe('Scenario: Observer setup and initialization', () => {
    test('starts observing progress events', async () => {
      expect(contentProgressObserver.isObserving).toBe(true)
    })

    test('loads award definitions on start', async () => {
      expect(fetchSanity).toHaveBeenCalled()
      expect(contentProgressObserver.allChildIds.size).toBeGreaterThan(0)
    })

    test('returns cleanup function', async () => {
      const cleanup = await contentProgressObserver.start()
      expect(typeof cleanup).toBe('function')
    })

    test('does not start twice', async () => {
      const firstCallCount = fetchSanity.mock.calls.length
      await contentProgressObserver.start()
      expect(fetchSanity.mock.calls.length).toBe(firstCallCount)
    })
  })

  describe('Scenario: Progress update triggers award progress event', () => {
    const testAward = getAwardByContentId(417049)

    beforeEach(() => {
      const completedLessonIds = [417045]

      db.contentProgress.queryOne.mockImplementation((whereClause) => {
        const contentId = whereClause?.comparison?.right?.value

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })
    })

    test('emits awardProgress event when lesson completed', async () => {
      emitProgressWithCollection(417030, 'guided-course', 417049)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardProgressListener).toHaveBeenCalled()
      const payload = awardProgressListener.mock.calls[0][0]
      expect(payload).toHaveProperty('awardId', testAward._id)
      expect(payload).toHaveProperty('progressPercentage')
    })

    test('calculates correct progress percentage', async () => {
      const completedLessonIds = [417045, 417046]

      db.contentProgress.queryOne.mockImplementation((whereClause) => {
        const contentId = whereClause?.comparison?.right?.value

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      emitProgressWithCollection(417030, 'guided-course', 417049)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        testAward._id,
        50,
        expect.objectContaining({
          progressData: expect.any(Object)
        })
      )
    })
  })

  describe('Scenario: Progress update triggers award granted event', () => {
    const testAward = getAwardByContentId(417049)

    test('emits awardGranted event when all lessons completed', async () => {
      emitProgressWithCollection(417030, 'guided-course', 417049)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledTimes(1)
      const payload = awardGrantedListener.mock.calls[0][0]
      expect(payload).toHaveProperty('awardId', testAward._id)
      expect(payload).toHaveProperty('completionData')
      expect(payload).toHaveProperty('popupMessage')
    })

    test('includes completion data in granted event', async () => {
      emitProgressWithCollection(417030, 'guided-course', 417049)
      await new Promise(resolve => setTimeout(resolve, 100))

      const payload = awardGrantedListener.mock.calls[0][0]
      expect(payload.completionData).toMatchObject({
        content_title: expect.any(String),
        completed_at: expect.any(String),
        days_user_practiced: expect.any(Number),
        practice_minutes: 200
      })
    })
  })

  describe('Scenario: Multiple lessons update rapidly (debouncing)', () => {
    const testAward = getAwardByContentId(416464)
    const nonKickoffLessons = [
      416467, 416468, 416469, 416470, 416471, 416472, 416473,
      416474, 416475, 416476, 416477, 416478, 416479, 416480, 416481,
      416482, 416483, 416484, 416485, 416486, 416487, 416488, 416489
    ]

    beforeEach(() => {
      const completedLessonIds = nonKickoffLessons.slice(0, 12)

      db.contentProgress.queryOne.mockImplementation((whereClause) => {
        const contentId = whereClause?.comparison?.right?.value

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })
    })

    test('debounces multiple rapid updates to same course', async () => {
      emitProgressWithCollection(416465, 'guided-course', 416464)
      emitProgressWithCollection(416467, 'guided-course', 416464)
      emitProgressWithCollection(416468, 'guided-course', 416464)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledTimes(1)
    })
  })

  describe('Scenario: Progress for lessons without awards', () => {
    test('ignores lessons not associated with awards', async () => {
      emitProgressWithCollection(999999, 'guided-course', 999000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardProgressListener).not.toHaveBeenCalled()
      expect(awardGrantedListener).not.toHaveBeenCalled()
    })
  })

  describe('Scenario: Kickoff lesson progress', () => {
    const testAward = getAwardByContentId(416446)

    test('kickoff lesson completion triggers but shows 0% progress', async () => {
      db.contentProgress.queryOne.mockImplementation(() => {
        return Promise.resolve({
          data: { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      emitProgressWithCollection(416447, 'guided-course', 416446)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        testAward._id,
        0,
        expect.objectContaining({
          progressData: expect.any(Object)
        })
      )
    })
  })

  describe('Scenario: Already completed award', () => {
    const testAward = getAwardByContentId(417049)

    beforeEach(() => {
      db.userAwardProgress.hasCompletedAward.mockResolvedValue(true)
    })

    test('does not re-grant already completed award', async () => {
      emitProgressWithCollection(417030, 'guided-course', 417049)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
      expect(db.userAwardProgress.recordAwardProgress).not.toHaveBeenCalledWith(
        expect.anything(),
        100,
        expect.objectContaining({ immediate: true })
      )
    })
  })

  describe('Scenario: Observer cleanup', () => {
    test('removes event listeners on stop', () => {
      contentProgressObserver.stop()
      expect(contentProgressObserver.isObserving).toBe(false)
    })

    test('clears debounce timers on stop', async () => {
      emitProgressWithCollection(417030, 'guided-course', 417049)
      contentProgressObserver.stop()

      expect(contentProgressObserver.debounceTimers.size).toBe(0)
    })
  })

  describe('Scenario: Learning path vs guided course event differentiation', () => {
    const learningPathAward = getAwardByContentId(417140)

    test('learning path award has correct popup message', async () => {
      emitProgressWithCollection(417105, 'learning-path-v2', 417140)
      await new Promise(resolve => setTimeout(resolve, 100))

      const payload = awardGrantedListener.mock.calls[0][0]
      expect(payload.popupMessage).toContain('learning path')
      expect(payload.popupMessage).not.toContain('guided course')
    })
  })

  describe('Scenario: Multiple courses progressing simultaneously', () => {
    const testAward1 = getAwardByContentId(416446)
    const testAward2 = getAwardByContentId(417049)

    beforeEach(() => {
      db.contentProgress.queryOne.mockImplementation(() => {
        return Promise.resolve({
          data: { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })
    })

    test('tracks progress for multiple courses independently', async () => {
      emitProgressWithCollection(416447, 'guided-course', 416446)
      await new Promise(resolve => setTimeout(resolve, 100))

      emitProgressWithCollection(417030, 'guided-course', 417049)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardProgressListener).toHaveBeenCalledTimes(2)

      const calls = awardProgressListener.mock.calls
      const awardIds = calls.map(call => call[0].awardId)
      expect(awardIds).toContain(testAward1._id)
      expect(awardIds).toContain(testAward2._id)
    })
  })
})
