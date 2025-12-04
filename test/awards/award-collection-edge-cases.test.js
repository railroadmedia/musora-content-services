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

  describe('Award data integrity', () => {
    test('award with empty child_ids array never triggers', async () => {
      const emptyChildAward = {
        _id: 'empty-child-award',
        child_ids: [],
        content_id: 888000,
        content_type: 'guided-course',
        name: 'Empty Child Award',
        brand: 'drumeo'
      }

      fetchSanity.mockResolvedValue([...mockAwardDefinitions, emptyChildAward])
      await awardDefinitions.refresh()
      await contentProgressObserver.stop()
      await contentProgressObserver.start()

      emitProgressWithCollection(999999, 'guided-course', 888000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
      expect(awardProgressListener).not.toHaveBeenCalled()
    })

    test('award with null child_ids never triggers', async () => {
      const nullChildAward = {
        _id: 'null-child-award',
        child_ids: null,
        content_id: 889000,
        content_type: 'guided-course',
        name: 'Null Child Award',
        brand: 'drumeo'
      }

      fetchSanity.mockResolvedValue([...mockAwardDefinitions, nullChildAward])
      await awardDefinitions.refresh()
      await contentProgressObserver.stop()
      await contentProgressObserver.start()

      emitProgressWithCollection(999999, 'guided-course', 889000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
      expect(awardProgressListener).not.toHaveBeenCalled()
    })

    test('award with null content_id skips processing', async () => {
      const nullContentIdAward = {
        _id: 'null-content-id-award',
        child_ids: [777001],
        content_id: null,
        content_type: 'guided-course',
        name: 'Null Content ID Award',
        brand: 'drumeo'
      }

      fetchSanity.mockResolvedValue([...mockAwardDefinitions, nullContentIdAward])
      await awardDefinitions.refresh()
      await contentProgressObserver.stop()
      await contentProgressObserver.start()

      emitProgressWithCollection(777001, 'guided-course', null)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
      expect(awardProgressListener).not.toHaveBeenCalled()
    })
  })

  describe('Multiple awards for same collection', () => {
    test('multiple awards for same parent all trigger when eligible', async () => {
      const award1 = {
        _id: 'multi-award-1',
        child_ids: [777001, 777002],
        content_id: 777000,
        content_type: 'learning-path-v2',
        name: 'Multi Award 1',
        brand: 'drumeo'
      }

      const award2 = {
        _id: 'multi-award-2',
        child_ids: [777001, 777002],
        content_id: 777000,
        content_type: 'learning-path-v2',
        name: 'Multi Award 2',
        brand: 'drumeo'
      }

      fetchSanity.mockResolvedValue([...mockAwardDefinitions, award1, award2])
      await awardDefinitions.refresh()
      await contentProgressObserver.stop()
      await contentProgressObserver.start()

      emitProgressWithCollection(777001, 'learning-path-v2', 777000)
      await new Promise(resolve => setTimeout(resolve, 100))

      const awardIds = awardGrantedListener.mock.calls.map(call => call[0].awardId)
      expect(awardIds).toContain('multi-award-1')
      expect(awardIds).toContain('multi-award-2')
    })
  })

  describe('Child in collection with no awards', () => {
    test('gracefully handles child with no matching awards', async () => {
      emitProgressWithCollection(999999, 'skill-pack', 999000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
      expect(awardProgressListener).not.toHaveBeenCalled()
    })
  })

  describe('Collection type case sensitivity', () => {
    test('exact case match required for collection type', async () => {
      emitProgressWithCollection(555001, 'Skill-Pack', 555000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
      expect(awardProgressListener).not.toHaveBeenCalled()
    })

    test('lowercase mismatch does not trigger', async () => {
      emitProgressWithCollection(555001, 'SKILL-PACK', 555000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
      expect(awardProgressListener).not.toHaveBeenCalled()
    })
  })

  describe('Debouncing per collection', () => {
    test('rapid completion of children in same collection debounces correctly', async () => {
      emitProgressWithCollection(555001, 'skill-pack', 555000)
      emitProgressWithCollection(555002, 'skill-pack', 555000)
      emitProgressWithCollection(555003, 'skill-pack', 555000)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledTimes(1)
    })

    test('rapid completion of children in different collections processes separately', async () => {
      emitProgressWithCollection(555001, 'skill-pack', 555000)
      emitProgressWithCollection(555004, 'learning-path-v2', 666000)
      emitProgressWithCollection(416448, 'guided-course', 416446)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledTimes(3)
      const awardIds = awardGrantedListener.mock.calls.map(call => call[0].awardId)
      expect(awardIds).toContain('skill-pack-award-1')
      expect(awardIds).toContain('learning-path-award-1')
      expect(awardIds).toContain('0238b1e5-ebee-42b3-9390-91467d113575')
    })
  })

  describe('Observer state management', () => {
    test('stop clears debounce timers', async () => {
      emitProgressWithCollection(555001, 'skill-pack', 555000)

      contentProgressObserver.stop()

      expect(contentProgressObserver.debounceTimers.size).toBe(0)
    })

    test('stop clears processing content IDs', async () => {
      emitProgressWithCollection(555001, 'skill-pack', 555000)

      contentProgressObserver.stop()

      expect(contentProgressObserver.processingContentIds.size).toBe(0)
    })

    test('restart after stop works correctly', async () => {
      contentProgressObserver.stop()
      await contentProgressObserver.start()

      emitProgressWithCollection(555001, 'skill-pack', 555000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })
  })

  describe('Collection ID type handling', () => {
    test('collection ID as number matches correctly', async () => {
      emitProgressWithCollection(555001, 'skill-pack', 555000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'skill-pack-award-1' })
      )
    })

    test('collection ID mismatch with correct type still fails', async () => {
      emitProgressWithCollection(555001, 'skill-pack', 555001)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
    })
  })
})
