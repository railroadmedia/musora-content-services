import { contentProgressObserver } from '../../src/services/awards/internal/content-progress-observer'
import { awardEvents } from '../../src/services/awards/internal/award-events'
import { emitProgressSaved } from '../../src/services/progress-events'
import { mockAwardDefinitions, getAwardByContentId, getAwardById } from '../mockData/award-definitions'

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
      emitProgressWithCollection(555004, 'learning-path-v2', 666000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'learning-path-award-1' })
      )
    })

    test('child in skill-pack triggers only skill-pack award', async () => {
      emitProgressWithCollection(555001, 'skill-pack', 555000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'skill-pack-award-1' })
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
      emitProgressWithCollection(555004, 'learning-path-v2', 999999)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
    })

    test('both type and ID must match to trigger award', async () => {
      emitProgressWithCollection(555001, 'skill-pack', 555000)
      await new Promise(resolve => setTimeout(resolve, 100))

      const call = awardGrantedListener.mock.calls[0]
      expect(call).toBeDefined()
      expect(call[0].definition.content_type).toBe('skill-pack')
      expect(call[0].definition.content_id).toBe(555000)
    })
  })

  describe('Overlapping children', () => {
    test('child 555003 in non-LP context triggers all matching awards (a la carte)', async () => {
      emitProgressWithCollection(555003, 'skill-pack', 555000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'skill-pack-award-1' })
      )
      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'learning-path-award-1' })
      )
    })

    test('child 555003 in learning-path-v2 context triggers only learning-path award', async () => {
      emitProgressWithCollection(555003, 'learning-path-v2', 666000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'learning-path-award-1' })
      )
      expect(awardGrantedListener).not.toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'skill-pack-award-1' })
      )
    })

    test('non-LP context triggers all awards, LP context triggers only matching LP award', async () => {
      emitProgressWithCollection(555003, 'skill-pack', 555000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalledTimes(2)

      awardGrantedListener.mockClear()
      db.userAwardProgress.hasCompletedAward.mockResolvedValue(true)

      emitProgressWithCollection(555003, 'learning-path-v2', 666000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
    })
  })

  describe('A la carte collection context', () => {
    test('collectionType null and collectionId null triggers awards (a la carte)', async () => {
      emitProgressWithCollection(555001, null, null)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })

    test('collectionType present but collectionId null triggers awards (a la carte)', async () => {
      emitProgressWithCollection(555001, 'skill-pack', null)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })

    test('collectionType null but collectionId present triggers awards (a la carte)', async () => {
      emitProgressWithCollection(555001, null, 555000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })
  })

  describe('Direct string comparison', () => {
    test('learning-path-v2 matches learning-path-v2 exactly', async () => {
      const learningPathAward = getAwardById('learning-path-award-1')
      expect(learningPathAward.content_type).toBe('learning-path-v2')

      emitProgressWithCollection(555004, 'learning-path-v2', 666000)
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
      const skillPackAward = getAwardById('skill-pack-award-1')
      expect(skillPackAward.content_type).toBe('skill-pack')

      emitProgressWithCollection(555001, 'skill-pack', 555000)
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
      emitProgressWithCollection(555004, 'learning-path-v2', 999999)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
      expect(awardProgressListener).not.toHaveBeenCalled()
    })

    test('non-LP child with wrong collection still triggers (a la carte)', async () => {
      emitProgressWithCollection(555001, 'skill-pack', 666000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })

    test('child not in any award ignores completely', async () => {
      emitProgressWithCollection(999999, 'skill-pack', 555000)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
      expect(awardProgressListener).not.toHaveBeenCalled()
    })
  })
})
