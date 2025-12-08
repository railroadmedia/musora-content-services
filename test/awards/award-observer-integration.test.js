import { contentProgressObserver } from '../../src/services/awards/internal/content-progress-observer'
import { awardEvents } from '../../src/services/awards/internal/award-events'
import { emitProgressSaved } from '../../src/services/progress-events'
import { mockAwardDefinitions, getAwardByContentId } from '../mockData/award-definitions'
import { setupDefaultMocks, setupAwardEventListeners } from './helpers'
import { mockCompletionStates } from './helpers/completion-mock'
import { COLLECTION_TYPE, waitForDebounce } from './helpers/progress-emitter'

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

describe('Award Observer Integration - E2E Scenarios', () => {
  let listeners

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

  const emitAlaCarteProgress = (contentId, progressPercent = 100) => {
    emitProgressWithCollection(contentId, null, null, progressPercent)
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    awardEvents.removeAllListeners()

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)
    setupDefaultMocks(db, fetchSanity)

    await awardDefinitions.refresh()

    listeners = setupAwardEventListeners(awardEvents)

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

    test('includes content_id in allChildIds Set', async () => {
      const lpAward = getAwardByContentId(417140)
      const gcAward = getAwardByContentId(416446)

      expect(contentProgressObserver.allChildIds.has(lpAward.content_id)).toBe(true)
      expect(contentProgressObserver.allChildIds.has(gcAward.content_id)).toBe(true)
    })

    test('includes all child_ids in allChildIds Set', async () => {
      const award = getAwardByContentId(416446)

      award.child_ids.forEach(childId => {
        expect(contentProgressObserver.allChildIds.has(childId)).toBe(true)
      })
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
      mockCompletionStates(db, [417045])
    })

    test('emits awardProgress event when lesson completed', async () => {
      emitAlaCarteProgress(417045)
      await waitForDebounce()

      expect(listeners.progress).toHaveBeenCalled()
      const payload = listeners.progress.mock.calls[0][0]
      expect(payload).toHaveProperty('awardId', testAward._id)
      expect(payload).toHaveProperty('progressPercentage')
    })

    test('calculates correct progress percentage', async () => {
      mockCompletionStates(db, [417045, 417046])

      emitAlaCarteProgress(417045)
      await waitForDebounce()

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
      emitAlaCarteProgress(417045)
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalledTimes(1)
      const payload = listeners.granted.mock.calls[0][0]
      expect(payload).toHaveProperty('awardId', testAward._id)
      expect(payload).toHaveProperty('completionData')
      expect(payload).toHaveProperty('popupMessage')
    })

    test('includes completion data in granted event', async () => {
      emitAlaCarteProgress(417045)
      await waitForDebounce()

      const payload = listeners.granted.mock.calls[0][0]
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
      mockCompletionStates(db, nonKickoffLessons.slice(0, 12))
    })

    test('debounces multiple rapid updates to same course', async () => {
      emitAlaCarteProgress(416467)
      emitAlaCarteProgress(416468)
      emitAlaCarteProgress(416469)

      await waitForDebounce()

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledTimes(1)
    })
  })

  describe('Scenario: Progress for lessons without awards', () => {
    test('ignores lessons not associated with awards', async () => {
      emitAlaCarteProgress(999999)
      await waitForDebounce()

      expect(listeners.progress).not.toHaveBeenCalled()
      expect(listeners.granted).not.toHaveBeenCalled()
    })
  })

  describe('Scenario: Non-completed progress status', () => {
    beforeEach(() => {
      mockCompletionStates(db, [])
    })

    test('does not trigger award granted when lessons not completed in DB', async () => {
      emitAlaCarteProgress(417045, 50)
      await waitForDebounce()

      expect(listeners.granted).not.toHaveBeenCalled()
    })

    test('started progress state in DB does not grant award', async () => {
      emitProgressSaved({
        userId: 123,
        contentId: 417045,
        progressPercent: 75,
        progressStatus: 'started',
        bubble: true,
        collectionType: null,
        collectionId: null,
        resumeTimeSeconds: null,
        timestamp: Date.now()
      })
      await waitForDebounce()

      expect(listeners.granted).not.toHaveBeenCalled()
    })
  })

  describe('Scenario: Excluded content progress', () => {
    test('excluded content (not in child_ids) does not trigger award progress', async () => {
      emitAlaCarteProgress(416447)
      await waitForDebounce()

      expect(db.userAwardProgress.recordAwardProgress).not.toHaveBeenCalled()
    })
  })

  describe('Scenario: Already completed award', () => {
    beforeEach(() => {
      db.userAwardProgress.hasCompletedAward.mockResolvedValue(true)
    })

    test('does not re-grant already completed award', async () => {
      emitAlaCarteProgress(417045)
      await waitForDebounce()

      expect(listeners.granted).not.toHaveBeenCalled()
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
      emitAlaCarteProgress(417045)
      contentProgressObserver.stop()

      expect(contentProgressObserver.debounceTimers.size).toBe(0)
    })

    test('clears allChildIds on stop', async () => {
      contentProgressObserver.stop()

      expect(contentProgressObserver.allChildIds.size).toBe(0)
    })
  })

  describe('Scenario: Learning path award events', () => {
    const learningPathAward = getAwardByContentId(417140)

    test('learning path award has correct popup message', async () => {
      emitProgressWithCollection(417105, COLLECTION_TYPE.LEARNING_PATH, 417140)
      await waitForDebounce()

      const payload = listeners.granted.mock.calls[0][0]
      expect(payload.popupMessage).toContain('Learn To Play The Drums')
      expect(payload.popupMessage).toContain('minutes')
      expect(payload.popupMessage).toContain('days')
    })
  })

  describe('Scenario: Multiple courses progressing simultaneously', () => {
    const testAward1 = getAwardByContentId(416446)
    const testAward2 = getAwardByContentId(417049)

    beforeEach(() => {
      mockCompletionStates(db, [])
    })

    test('tracks progress for multiple courses independently', async () => {
      emitAlaCarteProgress(416448)
      await waitForDebounce()

      emitAlaCarteProgress(417045)
      await waitForDebounce()

      expect(listeners.progress).toHaveBeenCalledTimes(2)

      const calls = listeners.progress.mock.calls
      const awardIds = calls.map(call => call[0].awardId)
      expect(awardIds).toContain(testAward1._id)
      expect(awardIds).toContain(testAward2._id)
    })
  })
})
