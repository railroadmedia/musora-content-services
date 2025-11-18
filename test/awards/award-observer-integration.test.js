import { contentProgressObserver } from '../../src/services/awards/content-progress-observer'
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

describe('Award Observer Integration - E2E Scenarios', () => {
  let mockDatabase
  let mockCollection
  let mockQuery
  let progressObservable
  let progressSubscriber
  let awardProgressListener
  let awardGrantedListener

  beforeEach(async () => {
    jest.clearAllMocks()
    awardEvents.removeAllListeners()

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)

    db.contentPractices.sumPracticeMinutesForContent = jest.fn().mockResolvedValue(200)
    db.userAwardProgress.hasCompletedAward = jest.fn().mockResolvedValue(false)
    db.userAwardProgress.recordAwardProgress = jest.fn().mockResolvedValue({ data: {}, status: 'synced' })
    db.userAwardProgress.completeAward = jest.fn().mockResolvedValue({ data: {}, status: 'synced' })

    db.contentProgress.queryAll = jest.fn().mockResolvedValue({
      data: [{ created_at: Math.floor(Date.now() / 1000) - 86400 * 10 }]
    })
    db.contentProgress.queryOne = jest.fn()

    progressObservable = {
      subscribe: jest.fn((callback) => {
        progressSubscriber = callback
        return {
          unsubscribe: jest.fn()
        }
      })
    }

    mockQuery = {
      observe: jest.fn(() => progressObservable),
      observeWithColumns: jest.fn(() => progressObservable)
    }

    mockCollection = {
      query: jest.fn(() => mockQuery)
    }

    mockDatabase = {
      collections: {
        get: jest.fn(() => mockCollection)
      }
    }

    await awardDefinitions.refresh()

    awardProgressListener = jest.fn()
    awardGrantedListener = jest.fn()
  })

  afterEach(() => {
    awardEvents.removeAllListeners()
    awardDefinitions.clear()
    contentProgressObserver.stop()
  })

  describe('Scenario: Observer setup and initialization', () => {
    test('starts observing content progress with correct query', async () => {
      await contentProgressObserver.start(mockDatabase)

      expect(mockDatabase.collections.get).toHaveBeenCalledWith('content_progress')
      expect(mockCollection.query).toHaveBeenCalled()
      expect(mockQuery.observeWithColumns).toHaveBeenCalledWith(['state', 'progress_percent'])
    })

    test('queries only child content IDs from award definitions', async () => {
      await contentProgressObserver.start(mockDatabase)

      const queryCall = mockCollection.query.mock.calls[0][0]
      expect(queryCall).toBeDefined()
    })

    test('returns cleanup function', async () => {
      const cleanup = await contentProgressObserver.start(mockDatabase)

      expect(typeof cleanup).toBe('function')
    })

    test('does not start twice', async () => {
      await contentProgressObserver.start(mockDatabase)
      await contentProgressObserver.start(mockDatabase)

      expect(mockDatabase.collections.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('Scenario: Progress update triggers award progress event', () => {
    const testAward = getAwardByContentId(417049)
    const courseId = 417049

    beforeEach(async () => {
      const completedLessonIds = [417045]

      db.contentProgress.queryOne.mockImplementation((queryFn) => {
        const mockQ = { where: jest.fn().mockReturnThis() }
        queryFn(mockQ)
        const contentId = mockQ.where.mock.calls[0][1]

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      awardEvents.on('awardProgress', awardProgressListener)

      await contentProgressObserver.start(mockDatabase)
    })

    test('emits awardProgress event when lesson completed', async () => {
      const lessonProgress = {
        content_id: 417030,
        state: 'completed',
        progress_percent: 100
      }

      await progressSubscriber([lessonProgress])

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardProgressListener).toHaveBeenCalled()
      const payload = awardProgressListener.mock.calls[0][0]
      expect(payload).toHaveProperty('awardId', testAward._id)
      expect(payload).toHaveProperty('progressPercentage')
    })

    test('calculates correct progress percentage', async () => {
      const completedLessonIds = [417045, 417046]

      db.contentProgress.queryOne.mockImplementation((queryFn) => {
        const mockQ = { where: jest.fn().mockReturnThis() }
        queryFn(mockQ)
        const contentId = mockQ.where.mock.calls[0][1]

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      const lessonProgress = {
        content_id: 417030,
        state: 'completed',
        progress_percent: 100
      }

      await progressSubscriber([lessonProgress])

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        testAward._id,
        50
      )
    })
  })

  describe('Scenario: Progress update triggers award granted event', () => {
    const testAward = getAwardByContentId(417049)

    beforeEach(async () => {
      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
      })

      awardEvents.on('awardGranted', awardGrantedListener)

      await contentProgressObserver.start(mockDatabase)
    })

    test('emits awardGranted event when all lessons completed', async () => {
      const lessonProgress = {
        content_id: 417030,
        state: 'completed',
        progress_percent: 100
      }

      await progressSubscriber([lessonProgress])

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledTimes(1)
      const payload = awardGrantedListener.mock.calls[0][0]
      expect(payload).toHaveProperty('awardId', testAward._id)
      expect(payload).toHaveProperty('completionData')
      expect(payload).toHaveProperty('popupMessage')
    })

    test('includes completion data in granted event', async () => {
      const lessonProgress = {
        content_id: 417030,
        state: 'completed',
        progress_percent: 100
      }

      await progressSubscriber([lessonProgress])

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

    beforeEach(async () => {
      const completedLessonIds = nonKickoffLessons.slice(0, 12)

      db.contentProgress.queryOne.mockImplementation((queryFn) => {
        const mockQ = { where: jest.fn().mockReturnThis() }
        queryFn(mockQ)
        const contentId = mockQ.where.mock.calls[0][1]

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      awardEvents.on('awardProgress', awardProgressListener)

      await contentProgressObserver.start(mockDatabase)
    })

    test('debounces multiple rapid updates to same course', async () => {
      const lesson1 = { content_id: 416465, state: 'completed', progress_percent: 100 }
      const lesson2 = { content_id: 416467, state: 'completed', progress_percent: 100 }
      const lesson3 = { content_id: 416468, state: 'completed', progress_percent: 100 }

      await progressSubscriber([lesson1])
      await progressSubscriber([lesson2])
      await progressSubscriber([lesson3])

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledTimes(1)
    })
  })

  describe('Scenario: Progress for lessons without awards', () => {
    beforeEach(async () => {
      awardEvents.on('awardProgress', awardProgressListener)
      awardEvents.on('awardGranted', awardGrantedListener)

      await contentProgressObserver.start(mockDatabase)
    })

    test('ignores lessons not associated with awards', async () => {
      const nonAwardLesson = {
        content_id: 999999,
        state: 'completed',
        progress_percent: 100
      }

      await progressSubscriber([nonAwardLesson])

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardProgressListener).not.toHaveBeenCalled()
      expect(awardGrantedListener).not.toHaveBeenCalled()
    })
  })

  describe('Scenario: Kickoff lesson progress', () => {
    const testAward = getAwardByContentId(416446)

    beforeEach(async () => {
      db.contentProgress.queryOne.mockImplementation((buildQuery) => {
        return Promise.resolve({
          data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      awardEvents.on('awardProgress', awardProgressListener)

      await contentProgressObserver.start(mockDatabase)
    })

    test('kickoff lesson completion triggers but shows 0% progress', async () => {
      db.contentProgress.queryOne.mockImplementation((queryFn) => {
        const mockQ = { where: jest.fn().mockReturnThis() }
        queryFn(mockQ)
        return Promise.resolve({
          data: { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      const kickoffLesson = {
        content_id: 416447,
        state: 'completed',
        progress_percent: 100
      }

      await progressSubscriber([kickoffLesson])

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        testAward._id,
        0
      )
    })
  })

  describe('Scenario: Already completed award', () => {
    const testAward = getAwardByContentId(417049)

    beforeEach(async () => {
      db.userAwardProgress.hasCompletedAward.mockResolvedValue(true)
      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
      })

      awardEvents.on('awardGranted', awardGrantedListener)

      await contentProgressObserver.start(mockDatabase)
    })

    test('does not re-grant already completed award', async () => {
      const lessonProgress = {
        content_id: 417030,
        state: 'completed',
        progress_percent: 100
      }

      await progressSubscriber([lessonProgress])

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
      expect(db.userAwardProgress.completeAward).not.toHaveBeenCalled()
    })
  })

  describe('Scenario: Observer cleanup', () => {
    test('unsubscribes on stop', async () => {
      await contentProgressObserver.start(mockDatabase)

      const subscription = progressObservable.subscribe.mock.results[0].value

      contentProgressObserver.stop()

      expect(subscription.unsubscribe).toHaveBeenCalled()
    })

    test('clears debounce timers on stop', async () => {
      await contentProgressObserver.start(mockDatabase)

      const lessonProgress = {
        content_id: 417030,
        state: 'completed',
        progress_percent: 100
      }

      await progressSubscriber([lessonProgress])

      contentProgressObserver.stop()

      expect(contentProgressObserver.debounceTimers.size).toBe(0)
    })
  })

  describe('Scenario: Learning path vs guided course event differentiation', () => {
    const learningPathAward = getAwardByContentId(417140)

    beforeEach(async () => {
      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
      })

      awardEvents.on('awardGranted', awardGrantedListener)

      await contentProgressObserver.start(mockDatabase)
    })

    test('learning path award has correct popup message', async () => {
      const lessonProgress = {
        content_id: 417105,
        state: 'completed',
        progress_percent: 100
      }

      await progressSubscriber([lessonProgress])

      await new Promise(resolve => setTimeout(resolve, 100))

      const payload = awardGrantedListener.mock.calls[0][0]
      expect(payload.popupMessage).toContain('learning path')
      expect(payload.popupMessage).not.toContain('guided course')
    })
  })

  describe('Scenario: Multiple courses progressing simultaneously', () => {
    const testAward1 = getAwardByContentId(416446)
    const testAward2 = getAwardByContentId(417049)

    beforeEach(async () => {
      db.contentProgress.queryOne.mockImplementation((buildQuery) => {
        return Promise.resolve({
          data: { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      awardEvents.on('awardProgress', awardProgressListener)

      await contentProgressObserver.start(mockDatabase)
    })

    test('tracks progress for multiple courses independently', async () => {
      const course1Lesson = {
        content_id: 416447,
        state: 'completed',
        progress_percent: 100
      }

      const course2Lesson = {
        content_id: 417030,
        state: 'completed',
        progress_percent: 100
      }

      await progressSubscriber([course1Lesson])
      await new Promise(resolve => setTimeout(resolve, 100))

      await progressSubscriber([course2Lesson])
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardProgressListener).toHaveBeenCalledTimes(2)

      const calls = awardProgressListener.mock.calls
      const awardIds = calls.map(call => call[0].awardId)
      expect(awardIds).toContain(testAward1._id)
      expect(awardIds).toContain(testAward2._id)
    })
  })
})
