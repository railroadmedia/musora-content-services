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

describe('Award Collection Filtering', () => {
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

  describe('Collection type matching', () => {
    test('child in learning-path-v2 triggers only learning-path-v2 award', async () => {
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

    test('child in skill-pack triggers only skill-pack award', async () => {
      emitProgress({
        contentId: 418001,
        collectionType: 'skill-pack',
        collectionId: 418000
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' })
      )
    })

    test('child in course triggers course award (a la carte)', async () => {
      emitProgress({
        contentId: 416448
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: '0238b1e5-ebee-42b3-9390-91467d113575' })
      )
    })
  })

  describe('Collection ID matching', () => {
    test('same content_type but different content_id does not trigger', async () => {
      emitProgress({
        contentId: 418004,
        collectionType: COLLECTION_TYPE.LEARNING_PATH,
        collectionId: 999999
      })
      await waitForDebounce()

      expect(listeners.granted).not.toHaveBeenCalled()
    })

    test('both type and ID must match to trigger award', async () => {
      emitProgress({
        contentId: 418001,
        collectionType: 'skill-pack',
        collectionId: 418000
      })
      await waitForDebounce()

      const call = listeners.granted.mock.calls[0]
      expect(call).toBeDefined()
      expect(call[0].definition.content_type).toBe('skill-pack')
      expect(call[0].definition.content_id).toBe(418000)
    })
  })

  describe('Overlapping children', () => {
    test('shared child in non-LP context triggers all matching awards (a la carte)', async () => {
      emitProgress({
        contentId: 418003,
        collectionType: 'skill-pack',
        collectionId: 418000
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' })
      )
      expect(listeners.granted).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e' })
      )
    })

    test('shared child in learning-path-v2 context triggers only learning-path award', async () => {
      emitProgress({
        contentId: 418003,
        collectionType: COLLECTION_TYPE.LEARNING_PATH,
        collectionId: 418010
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e' })
      )
      expect(listeners.granted).not.toHaveBeenCalledWith(
        expect.objectContaining({ awardId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' })
      )
    })

    test('non-LP context triggers all awards, LP context triggers only matching LP award', async () => {
      emitProgress({
        contentId: 418003,
        collectionType: 'skill-pack',
        collectionId: 418000
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalledTimes(2)

      listeners.granted.mockClear()
      db.userAwardProgress.hasCompletedAward.mockResolvedValue(true)

      emitProgress({
        contentId: 418003,
        collectionType: COLLECTION_TYPE.LEARNING_PATH,
        collectionId: 418010
      })
      await waitForDebounce()

      expect(listeners.granted).not.toHaveBeenCalled()
    })
  })

  describe('A la carte collection context', () => {
    test('collectionType null and collectionId null triggers awards (a la carte)', async () => {
      emitProgress({ contentId: 418001 })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalled()
    })

    test('collectionType present but collectionId null triggers awards (a la carte)', async () => {
      emitProgress({
        contentId: 418001,
        collectionType: 'skill-pack',
        collectionId: null
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalled()
    })

    test('collectionType null but collectionId present triggers awards (a la carte)', async () => {
      emitProgress({
        contentId: 418001,
        collectionType: null,
        collectionId: 418000
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalled()
    })
  })

  describe('Direct string comparison', () => {
    test('learning-path-v2 matches learning-path-v2 exactly', async () => {
      emitProgress({
        contentId: 418004,
        collectionType: COLLECTION_TYPE.LEARNING_PATH,
        collectionId: 418010
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalledWith(
        expect.objectContaining({
          definition: expect.objectContaining({
            content_type: 'learning-path-v2'
          })
        })
      )
    })

    test('skill-pack matches skill-pack exactly', async () => {
      emitProgress({
        contentId: 418001,
        collectionType: 'skill-pack',
        collectionId: 418000
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalledWith(
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
      emitProgress({
        contentId: 418004,
        collectionType: COLLECTION_TYPE.LEARNING_PATH,
        collectionId: 999999
      })
      await waitForDebounce()

      expect(listeners.granted).not.toHaveBeenCalled()
      expect(listeners.progress).not.toHaveBeenCalled()
    })

    test('non-LP child with wrong collection still triggers (a la carte)', async () => {
      emitProgress({
        contentId: 418001,
        collectionType: 'skill-pack',
        collectionId: 418010
      })
      await waitForDebounce()

      expect(listeners.granted).toHaveBeenCalled()
    })

    test('child not in any award ignores completely', async () => {
      emitProgress({
        contentId: 999999,
        collectionType: 'skill-pack',
        collectionId: 418000
      })
      await waitForDebounce()

      expect(listeners.granted).not.toHaveBeenCalled()
      expect(listeners.progress).not.toHaveBeenCalled()
    })
  })
})
