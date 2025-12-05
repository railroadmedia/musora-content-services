import { contentProgressObserver } from '../../src/services/awards/internal/content-progress-observer'
import { awardEvents } from '../../src/services/awards/internal/award-events'
import { mockAwardDefinitions } from '../mockData/award-definitions'
import { setupDefaultMocks, setupAwardEventListeners } from './helpers'
import { COLLECTION_TYPE, emitProgress, waitForDebounce } from './helpers/progress-emitter'

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

describe('Award Collection Filtering - Edge Cases', () => {
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

  describe('Child in collection with no awards', () => {
    test('gracefully handles child with no matching awards', async () => {
      emitProgress({
        contentId: 999999,
        collectionType: 'skill-pack',
        collectionId: 999000
      })
      await waitForDebounce()

      expect(listeners.granted).not.toHaveBeenCalled()
      expect(listeners.progress).not.toHaveBeenCalled()
    })
  })

  describe('Collection type case sensitivity for learning paths', () => {
    test('wrong case LP collection type falls back to a la carte', async () => {
      emitProgress({
        contentId: 418004,
        collectionType: 'Learning-Path-V2',
        collectionId: 418010
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalled()
    })

    test('case mismatch in non-LP still triggers (a la carte)', async () => {
      emitProgress({
        contentId: 418001,
        collectionType: 'SKILL-PACK',
        collectionId: 418000
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalled()
    })
  })

  describe('Debouncing per collection', () => {
    test('rapid completion of children debounces per award content_id', async () => {
      emitProgress({
        contentId: 418001,
        collectionType: 'skill-pack',
        collectionId: 418000
      })
      emitProgress({
        contentId: 418002,
        collectionType: 'skill-pack',
        collectionId: 418000
      })

      await waitForDebounce()

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledTimes(1)
    })

    test('rapid completion of children in different contexts processes separately', async () => {
      emitProgress({
        contentId: 418004,
        collectionType: COLLECTION_TYPE.LEARNING_PATH,
        collectionId: 418010
      })
      emitProgress({
        contentId: 416448,
        collectionType: COLLECTION_TYPE.GUIDED_COURSE,
        collectionId: 416446
      })

      await waitForDebounce()

      expect(listeners.granted.mock.calls.length).toBeGreaterThanOrEqual(2)
      const awardIds = listeners.granted.mock.calls.map(call => call[0].awardId)
      expect(awardIds).toContain('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e')
      expect(awardIds).toContain('0238b1e5-ebee-42b3-9390-91467d113575')
    })
  })

  describe('Observer state management', () => {
    test('stop clears debounce timers', async () => {
      emitProgress({
        contentId: 418001,
        collectionType: 'skill-pack',
        collectionId: 418000
      })

      contentProgressObserver.stop()

      expect(contentProgressObserver.debounceTimers.size).toBe(0)
    })

    test('stop clears processing content IDs', async () => {
      emitProgress({
        contentId: 418001,
        collectionType: 'skill-pack',
        collectionId: 418000
      })

      contentProgressObserver.stop()

      expect(contentProgressObserver.processingContentIds.size).toBe(0)
    })

    test('restart after stop works correctly', async () => {
      contentProgressObserver.stop()
      await contentProgressObserver.start()

      emitProgress({
        contentId: 418001,
        collectionType: 'skill-pack',
        collectionId: 418000
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalled()
    })
  })

  describe('Collection ID type handling', () => {
    test('collection ID as number matches correctly for LP', async () => {
      emitProgress({
        contentId: 418004,
        collectionType: COLLECTION_TYPE.LEARNING_PATH,
        collectionId: 418010
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e' })
      )
    })

    test('LP collection ID mismatch with correct type fails', async () => {
      emitProgress({
        contentId: 418004,
        collectionType: COLLECTION_TYPE.LEARNING_PATH,
        collectionId: 999999
      })
      await waitForDebounce()

      expect(listeners.granted).not.toHaveBeenCalled()
    })

    test('non-LP collection ID mismatch still triggers (a la carte)', async () => {
      emitProgress({
        contentId: 418001,
        collectionType: 'skill-pack',
        collectionId: 418002
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalled()
    })
  })
})
