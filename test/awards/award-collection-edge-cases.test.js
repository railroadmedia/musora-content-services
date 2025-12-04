import { contentProgressObserver } from '../../src/services/awards/internal/content-progress-observer'
import { awardEvents } from '../../src/services/awards/internal/award-events'
import { emitProgressSaved } from '../../src/services/progress-events'
import { mockAwardDefinitions } from '../mockData/award-definitions'

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

describe('Award Collection Filtering - Edge Cases', () => {
  let awardProgressListener
  let awardGrantedListener

  const emitProgressWithCollection = (contentId, collectionType, collectionId) => {
    emitProgressSaved({
      userId: 123,
      contentId,
      progressPercent: 100,
      progressStatus: 'completed',
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

  describe('Child in collection with no awards', () => {
    test('gracefully handles child with no matching awards', async () => {
      emitProgressWithCollection(999999, 'skill-pack', 999000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
      expect(awardProgressListener).not.toHaveBeenCalled()
    })
  })

  describe('Collection type case sensitivity for learning paths', () => {
    test('wrong case LP collection type falls back to a la carte', async () => {
      emitProgressWithCollection(418004, 'Learning-Path-V2', 418010)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })

    test('case mismatch in non-LP still triggers (a la carte)', async () => {
      emitProgressWithCollection(418001, 'SKILL-PACK', 418000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })
  })

  describe('Debouncing per collection', () => {
    test('rapid completion of children debounces per award content_id', async () => {
      emitProgressWithCollection(418001, 'skill-pack', 418000)
      emitProgressWithCollection(418002, 'skill-pack', 418000)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledTimes(1)
    })

    test('rapid completion of children in different contexts processes separately', async () => {
      emitProgressWithCollection(418004, 'learning-path-v2', 418010)
      emitProgressWithCollection(416448, 'guided-course', 416446)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener.mock.calls.length).toBeGreaterThanOrEqual(2)
      const awardIds = awardGrantedListener.mock.calls.map(call => call[0].awardId)
      expect(awardIds).toContain('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e')
      expect(awardIds).toContain('0238b1e5-ebee-42b3-9390-91467d113575')
    })
  })

  describe('Observer state management', () => {
    test('stop clears debounce timers', async () => {
      emitProgressWithCollection(418001, 'skill-pack', 418000)

      contentProgressObserver.stop()

      expect(contentProgressObserver.debounceTimers.size).toBe(0)
    })

    test('stop clears processing content IDs', async () => {
      emitProgressWithCollection(418001, 'skill-pack', 418000)

      contentProgressObserver.stop()

      expect(contentProgressObserver.processingContentIds.size).toBe(0)
    })

    test('restart after stop works correctly', async () => {
      contentProgressObserver.stop()
      await contentProgressObserver.start()

      emitProgressWithCollection(418001, 'skill-pack', 418000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })
  })

  describe('Collection ID type handling', () => {
    test('collection ID as number matches correctly for LP', async () => {
      emitProgressWithCollection(418004, 'learning-path-v2', 418010)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e' })
      )
    })

    test('LP collection ID mismatch with correct type fails', async () => {
      emitProgressWithCollection(418004, 'learning-path-v2', 999999)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
    })

    test('non-LP collection ID mismatch still triggers (a la carte)', async () => {
      emitProgressWithCollection(418001, 'skill-pack', 418002)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })
  })
})
