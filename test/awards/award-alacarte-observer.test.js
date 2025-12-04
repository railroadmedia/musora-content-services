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

describe('Award Observer - A La Carte Progress (null collection)', () => {
  let awardProgressListener
  let awardGrantedListener

  const emitAlaCarteProgress = (contentId, progressPercent = 100) => {
    emitProgressSaved({
      userId: 123,
      contentId,
      progressPercent,
      progressStatus: progressPercent === 100 ? 'completed' : 'started',
      bubble: true,
      collectionType: null,
      collectionId: null,
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

  describe('A la carte progress triggers award evaluation', () => {
    const testAward = getAwardByContentId(417049)

    test('finds awards when progress has null collection type', async () => {
      emitAlaCarteProgress(417045)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
      const payload = awardGrantedListener.mock.calls[0][0]
      expect(payload).toHaveProperty('awardId', testAward._id)
    })

    test('emits awardProgress for partial completion with null collection', async () => {
      const completedLessonIds = [417045]

      db.contentProgress.queryOne.mockImplementation((whereClause) => {
        const contentId = whereClause?.comparison?.right?.value

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      emitAlaCarteProgress(417045)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardProgressListener).toHaveBeenCalled()
      const payload = awardProgressListener.mock.calls[0][0]
      expect(payload).toHaveProperty('awardId', testAward._id)
      expect(payload).toHaveProperty('progressPercentage')
    })
  })

  describe('A la carte grants award when all children completed', () => {
    const testAward = getAwardByContentId(416442)

    test('grants award for guided course with null collection progress', async () => {
      emitAlaCarteProgress(416444)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
      const payload = awardGrantedListener.mock.calls[0][0]
      expect(payload).toHaveProperty('awardId', testAward._id)
      expect(payload).toHaveProperty('completionData')
    })

    test('includes completion data in granted event', async () => {
      emitAlaCarteProgress(416444)
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

  describe('A la carte progress matches multiple awards', () => {
    test('finds all awards containing the child content id', async () => {
      const sharedChildId = 555003

      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
      })

      emitAlaCarteProgress(sharedChildId)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalled()
    })
  })

  describe('A la carte debouncing', () => {
    const testAward = getAwardByContentId(416450)

    beforeEach(() => {
      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'started', created_at: Math.floor(Date.now() / 1000) }
      })
    })

    test('debounces multiple rapid a la carte updates', async () => {
      emitAlaCarteProgress(416451)
      emitAlaCarteProgress(416453)
      emitAlaCarteProgress(416454)

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledTimes(1)
    })
  })

  describe('A la carte does not match unrelated content', () => {
    test('ignores content not in any award child_ids', async () => {
      emitAlaCarteProgress(999999)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardProgressListener).not.toHaveBeenCalled()
      expect(awardGrantedListener).not.toHaveBeenCalled()
    })
  })

  describe('A la carte already completed award', () => {
    beforeEach(() => {
      db.userAwardProgress.hasCompletedAward.mockResolvedValue(true)
    })

    test('does not re-grant already completed award', async () => {
      emitAlaCarteProgress(417045)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
    })
  })

  describe('A la carte vs collection-scoped progress handling', () => {
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

    test('a la carte progress finds awards regardless of award content_type', async () => {
      emitAlaCarteProgress(417045)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })

    test('non-LP collection context still triggers awards (a la carte for non-LP)', async () => {
      emitProgressWithCollection(417045, 'guided-course', 999999)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).toHaveBeenCalled()
    })

    test('LP collection context requires matching collection', async () => {
      awardGrantedListener.mockClear()

      emitProgressWithCollection(555004, 'learning-path-v2', 999999)
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(awardGrantedListener).not.toHaveBeenCalled()
    })
  })
})
