import { contentProgressObserver } from '../../src/services/awards/internal/content-progress-observer'
import { awardEvents } from '../../src/services/awards/internal/award-events'
import { mockAwardDefinitions, getAwardByContentId } from '../mockData/award-definitions'
import { setupDefaultMocks, setupAwardEventListeners } from './helpers'
import { mockCompletionStates, mockAllCompleted } from './helpers/completion-mock'
import { COLLECTION_TYPE, emitAlaCarteProgress, emitProgress, waitForDebounce } from './helpers/progress-emitter'

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

describe('Award Observer - A La Carte Progress (null collection)', () => {
  let listeners

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

  describe('A la carte progress triggers award evaluation', () => {
    const testAward = getAwardByContentId(417049)

    test('finds awards when progress has null collection type', async () => {
      emitAlaCarteProgress(417045)
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalled()
      const payload = listeners.granted.mock.calls[0][0]
      expect(payload).toHaveProperty('awardId', testAward._id)
    })

    test('emits awardProgress for partial completion with null collection', async () => {
      mockCompletionStates(db, [417045])

      emitAlaCarteProgress(417045)
      await waitForDebounce()

      expect(listeners.progress).toHaveBeenCalled()
      const payload = listeners.progress.mock.calls[0][0]
      expect(payload).toHaveProperty('awardId', testAward._id)
      expect(payload).toHaveProperty('progressPercentage')
    })
  })

  describe('A la carte grants award when all children completed', () => {
    const testAward = getAwardByContentId(416442)

    test('grants award for guided course with null collection progress', async () => {
      emitAlaCarteProgress(416444)
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalled()
      const payload = listeners.granted.mock.calls[0][0]
      expect(payload).toHaveProperty('awardId', testAward._id)
      expect(payload).toHaveProperty('completionData')
    })

    test('includes completion data in granted event', async () => {
      emitAlaCarteProgress(416444)
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

  describe('A la carte progress matches multiple awards', () => {
    test('finds all awards containing the child content id', async () => {
      const sharedChildId = 418003

      mockAllCompleted(db)

      emitAlaCarteProgress(sharedChildId)
      await waitForDebounce()

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalled()
    })
  })

  describe('A la carte debouncing', () => {
    beforeEach(() => {
      mockCompletionStates(db, [])
    })

    test('debounces multiple rapid a la carte updates', async () => {
      emitAlaCarteProgress(416451)
      emitAlaCarteProgress(416453)
      emitAlaCarteProgress(416454)

      await waitForDebounce()

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledTimes(1)
    })
  })

  describe('A la carte does not match unrelated content', () => {
    test('ignores content not in any award child_ids', async () => {
      emitAlaCarteProgress(999999)
      await waitForDebounce()

      expect(listeners.progress).not.toHaveBeenCalled()
      expect(listeners.granted).not.toHaveBeenCalled()
    })
  })

  describe('A la carte already completed award', () => {
    beforeEach(() => {
      db.userAwardProgress.hasCompletedAward.mockResolvedValue(true)
    })

    test('does not re-grant already completed award', async () => {
      emitAlaCarteProgress(417045)
      await waitForDebounce()

      expect(listeners.granted).not.toHaveBeenCalled()
    })
  })

  describe('A la carte vs collection-scoped progress handling', () => {
    test('a la carte progress finds awards regardless of award content_type', async () => {
      emitAlaCarteProgress(417045)
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalled()
    })

    test('non-LP collection context still triggers awards (a la carte)', async () => {
      emitProgress({
        contentId: 417045,
        collectionType: COLLECTION_TYPE.GUIDED_COURSE,
        collectionId: 999999
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalled()
    })

    test('LP collection context requires matching collection', async () => {
      listeners.granted.mockClear()

      emitProgress({
        contentId: 418004,
        collectionType: COLLECTION_TYPE.LEARNING_PATH,
        collectionId: 999999
      })
      await waitForDebounce()

      expect(listeners.granted).not.toHaveBeenCalled()
    })
  })
})
