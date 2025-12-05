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

describe('Award Collection Filtering', () => {
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

  describe('Collection type matching', () => {
    test('child in learning-path-v2 triggers only learning-path-v2 award', async () => {
      emitProgressWithCollection(418004, 'learning-path-v2', 418010)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e' })
      )
    })

    test('child in skill-pack triggers only skill-pack award', async () => {
      emitProgressWithCollection(418001, 'skill-pack', 418000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' })
      )
    })

    test('child in guided-course triggers only guided-course award', async () => {
      emitProgressWithCollection(416448, 'guided-course', 416446)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: '0238b1e5-ebee-42b3-9390-91467d113575' })
      )
    })
  })

  describe('Collection ID matching', () => {
    test('same content_type but different content_id does not trigger', async () => {
      emitProgressWithCollection(418004, 'learning-path-v2', 999999)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
    })

    test('both type and ID must match to trigger award', async () => {
      emitProgressWithCollection(418001, 'skill-pack', 418000)
      await new Promise(resolve => setTimeout(resolve, 100))

      const call = awardGrantedListener.mock.calls[0]
      expect(call).toBeDefined()
      expect(call[0].definition.content_type).toBe('skill-pack')
      expect(call[0].definition.content_id).toBe(418000)
    })
  })

  describe('Overlapping children', () => {
    test('shared child in non-LP context triggers all matching awards (a la carte)', async () => {
      emitProgressWithCollection(418003, 'skill-pack', 418000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' })
      )
      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e' })
      )
    })

    test('shared child in learning-path-v2 context triggers only learning-path award', async () => {
      emitProgressWithCollection(418003, 'learning-path-v2', 418010)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e' })
      )
      expect(awardGrantedListener).not.toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' })
      )
    })

    test('non-LP context triggers all awards, LP context triggers only matching LP award', async () => {
      emitProgressWithCollection(418003, 'skill-pack', 418000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledTimes(2)

      awardGrantedListener.mockClear()
      db.userAwardProgress.hasCompletedAward.mockResolvedValue(true)

      emitProgressWithCollection(418003, 'learning-path-v2', 418010)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
    })
  })

  describe('A la carte collection context', () => {
    test('collectionType null and collectionId null triggers awards (a la carte)', async () => {
      emitProgressWithCollection(418001, null, null)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })

    test('collectionType present but collectionId null triggers awards (a la carte)', async () => {
      emitProgressWithCollection(418001, 'skill-pack', null)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })

    test('collectionType null but collectionId present triggers awards (a la carte)', async () => {
      emitProgressWithCollection(418001, null, 418000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })
  })

  describe('Direct string comparison', () => {
    test('learning-path-v2 matches learning-path-v2 exactly', async () => {
      emitProgressWithCollection(418004, 'learning-path-v2', 418010)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({
          definition: expect.objectContaining({
            content_type: 'learning-path-v2'
          })
        })
      )
    })

    test('skill-pack matches skill-pack exactly', async () => {
      emitProgressWithCollection(418001, 'skill-pack', 418000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({
          definition: expect.objectContaining({
            content_type: 'skill-pack'
          })
        })
      )
    })
  })


  describe('Non-matching collection context', () => {
    test('LP child in wrong LP collection ID ignores award', async () => {
      emitProgressWithCollection(418004, 'learning-path-v2', 999999)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
      expect(awardProgressListener).not.toHaveBeenCalled()
    })

    test('non-LP child with wrong collection still triggers (a la carte)', async () => {
      emitProgressWithCollection(418001, 'skill-pack', 418010)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })

    test('child not in any award ignores completely', async () => {
      emitProgressWithCollection(999999, 'skill-pack', 418000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
      expect(awardProgressListener).not.toHaveBeenCalled()
    })
  })
})
