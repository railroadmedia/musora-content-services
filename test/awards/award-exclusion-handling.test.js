import { awardManager } from '../../src/services/awards/internal/award-manager'
import { awardEvents } from '../../src/services/awards/internal/award-events'
import { mockAwardDefinitions, getAwardByContentId } from '../mockData/award-definitions'
import { globalConfig } from '../../src/services/config'
import { LocalStorageMock } from '../localStorageMock'

jest.mock('../../src/services/sanity', () => ({
  default: {
    fetch: jest.fn()
  },
  fetchSanity: jest.fn()
}))

jest.mock('../../src/services/railcontent', () => ({
  ...jest.requireActual('../../src/services/railcontent'),
  fetchUserPermissionsData: jest.fn().mockResolvedValue({ permissions: [108, 91, 92], isAdmin: false })
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

describe('Award Content Exclusion Handling - E2E Scenarios', () => {
  let awardGrantedListener

  beforeEach(async () => {
    jest.clearAllMocks()
    globalConfig.localStorage = new LocalStorageMock()
    awardEvents.removeAllListeners()

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)
    fetchSanity.mockResolvedValue(mockAwardDefinitions)

    db.practices.sumPracticeMinutesForContent = jest.fn().mockResolvedValue(150)
    db.userAwardProgress.hasCompletedAward = jest.fn().mockResolvedValue(false)
    db.userAwardProgress.recordAwardProgress = jest.fn().mockResolvedValue({ data: {}, status: 'synced' })
    db.userAwardProgress.completeAward = jest.fn().mockResolvedValue({ data: {}, status: 'synced' })

    db.contentProgress.queryAll.mockResolvedValue({
      data: [{ created_at: Math.floor(Date.now() / 1000) - 86400 * 7 }]
    })

    await awardDefinitions.refresh()

    awardGrantedListener = jest.fn()
  })

  afterEach(() => {
    awardEvents.removeAllListeners()
    awardDefinitions.clear()
  })

  describe('Scenario: Guided course with excluded intro video (416446 - 1 eligible lesson)', () => {
    const testAward = getAwardByContentId(416446)
    const courseId = 416446

    test('child_ids only contains eligible content (intro video excluded by Sanity)', () => {
      expect(testAward.child_ids).toEqual([416448])
      expect(testAward.child_ids).not.toContain(416447)
    })

    test('completing the single eligible lesson grants award at 100%', async () => {
      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
      })

      awardEvents.on('awardGranted', awardGrantedListener)

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        expect.any(String),
        100,
        expect.objectContaining({
          completedAt: expect.any(Number),
          immediate: true
        })
      )
      expect(awardGrantedListener).toHaveBeenCalledTimes(1)
    })

    test('shows 0% progress when eligible lesson not completed', async () => {
      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'started', created_at: Math.floor(Date.now() / 1000) }
      })

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        testAward._id,
        0,
        expect.objectContaining({
          progressData: expect.any(Object)
        })
      )
    })
  })

  describe('Scenario: Course with 4 eligible lessons (417049 - intro excluded)', () => {
    const testAward = getAwardByContentId(417049)
    const courseId = 417049

    test('child_ids contains only 4 eligible lessons (intro 417030 excluded by Sanity)', () => {
      expect(testAward.child_ids).toEqual([417045, 417046, 417047, 417048])
      expect(testAward.child_ids).not.toContain(417030)
      expect(testAward.child_ids.length).toBe(4)
    })

    test('completing 1 of 4 lessons shows 25% progress', async () => {
      const completedLessonIds = [417045]

      db.contentProgress.queryOne.mockImplementation((whereClause) => {
        const contentId = whereClause?.comparison?.right?.value

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        testAward._id,
        25,
        expect.objectContaining({
          progressData: expect.any(Object)
        })
      )
    })

    test('completing 2 of 4 lessons shows 50% progress', async () => {
      const completedLessonIds = [417045, 417046]

      db.contentProgress.queryOne.mockImplementation((whereClause) => {
        const contentId = whereClause?.comparison?.right?.value

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        testAward._id,
        50,
        expect.objectContaining({
          progressData: expect.any(Object)
        })
      )
    })

    test('must complete all 4 eligible lessons to earn award', async () => {
      const completedLessonIds = [417045, 417046, 417047, 417048]

      db.contentProgress.queryOne.mockImplementation((whereClause) => {
        const contentId = whereClause?.comparison?.right?.value

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      awardEvents.on('awardGranted', awardGrantedListener)

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        expect.any(String),
        100,
        expect.objectContaining({
          completedAt: expect.any(Number),
          immediate: true
        })
      )
      expect(awardGrantedListener).toHaveBeenCalledTimes(1)
    })
  })

  describe('Scenario: Large course with 23 eligible lessons (416464 - intro excluded)', () => {
    const testAward = getAwardByContentId(416464)
    const courseId = 416464
    const eligibleLessons = [
      416467, 416468, 416469, 416470, 416471, 416472, 416473,
      416474, 416475, 416476, 416477, 416478, 416479, 416480, 416481,
      416482, 416483, 416484, 416485, 416486, 416487, 416488, 416489
    ]

    test('child_ids contains 23 eligible lessons (intro 416465 excluded by Sanity)', () => {
      expect(testAward.child_ids).toEqual(eligibleLessons)
      expect(testAward.child_ids).not.toContain(416465)
      expect(testAward.child_ids.length).toBe(23)
    })

    test('shows 0% progress when no eligible lessons completed', async () => {
      db.contentProgress.queryOne.mockImplementation(() => {
        return Promise.resolve({
          data: { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        testAward._id,
        0,
        expect.objectContaining({
          progressData: expect.any(Object)
        })
      )
    })

    test('completing 12 of 23 lessons shows ~52% progress', async () => {
      const completedLessonIds = eligibleLessons.slice(0, 12)

      db.contentProgress.queryOne.mockImplementation((whereClause) => {
        const contentId = whereClause?.comparison?.right?.value

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        testAward._id,
        52,
        expect.objectContaining({
          progressData: expect.any(Object)
        })
      )
    })

    test('must complete all 23 eligible lessons to earn award', async () => {
      db.contentProgress.queryOne.mockImplementation((whereClause) => {
        const contentId = whereClause?.comparison?.right?.value

        return Promise.resolve({
          data: eligibleLessons.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      awardEvents.on('awardGranted', awardGrantedListener)

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        expect.any(String),
        100,
        expect.objectContaining({
          completedAt: expect.any(Number),
          immediate: true
        })
      )
      expect(awardGrantedListener).toHaveBeenCalledTimes(1)
    })
  })

  describe('Scenario: Course type without excluded content (417039 - all 3 lessons count)', () => {
    const testAward = getAwardByContentId(417039)
    const courseId = 417039

    test('all lessons are eligible when none are excluded', () => {
      expect(testAward.child_ids).toEqual([417035, 417036, 417038])
      expect(testAward.child_ids.length).toBe(3)
    })

    test('first lesson counts toward progress', async () => {
      const completedLessonIds = [417035]

      db.contentProgress.queryOne.mockImplementation((whereClause) => {
        const contentId = whereClause?.comparison?.right?.value

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        testAward._id,
        33,
        expect.objectContaining({
          progressData: expect.any(Object)
        })
      )
    })

    test('all 3 lessons must be completed to earn award', async () => {
      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
      })

      awardEvents.on('awardGranted', awardGrantedListener)

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        expect.any(String),
        100,
        expect.objectContaining({
          completedAt: expect.any(Number),
          immediate: true
        })
      )
    })
  })

  describe('Scenario: Learning path content type (417140)', () => {
    const testAward = getAwardByContentId(417140)
    const courseId = 417140

    test('learning paths use same exclusion logic as courses', () => {
      expect(testAward.content_type).toBe('learning-path-v2')
      expect(testAward.child_ids.length).toBe(22)
    })

    test('all child content counts toward progress', async () => {
      const completedLessonIds = testAward.child_ids.slice(0, 11)

      db.contentProgress.queryOne.mockImplementation((whereClause) => {
        const contentId = whereClause?.comparison?.right?.value

        return Promise.resolve({
          data: completedLessonIds.includes(contentId)
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      await awardManager.onContentCompleted(courseId)

      expect(db.userAwardProgress.recordAwardProgress).toHaveBeenCalledWith(
        testAward._id,
        50,
        expect.objectContaining({
          progressData: expect.any(Object)
        })
      )
    })
  })

  describe('Scenario: Skill pack content type (555000)', () => {
    const testAward = getAwardByContentId(555000)
    const courseId = 555000

    test('skill packs use same exclusion logic as other content types', () => {
      expect(testAward.content_type).toBe('skill-pack')
      expect(testAward.child_ids).toEqual([555001, 555002, 555003])
    })

    test('completing all lessons grants award', async () => {
      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
      })

      awardEvents.on('awardGranted', awardGrantedListener)

      await awardManager.onContentCompleted(courseId)

      expect(awardGrantedListener).toHaveBeenCalledTimes(1)
    })
  })
})
