import { awardManager } from '../../src/services/awards/award-manager'
import { awardEvents } from '../../src/services/awards/award-events'
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
import { awardDefinitions } from '../../src/services/awards/award-definitions'

describe('Award Kickoff Lesson Handling - E2E Scenarios', () => {
  let awardGrantedListener

  beforeEach(async () => {
    jest.clearAllMocks()
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

  describe('Scenario: Course with has_kickoff=true and 2 lessons (416447=kickoff, 416448=regular)', () => {
    const testAward = getAwardByContentId(416446)
    const courseId = 416446

    test('kickoff lesson does not count toward progress', async () => {
      db.contentProgress.queryOne.mockImplementation((queryFn) => {
        const mockQ = { where: jest.fn().mockReturnThis() }
        queryFn(mockQ)
        const contentId = mockQ.where.mock.calls[0][1]

        return Promise.resolve({
          data: contentId === 416447
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
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

    test('completing only lesson 2 (after kickoff) shows 100% and grants award', async () => {
      db.contentProgress.queryOne.mockImplementation((queryFn) => {
        const mockQ = { where: jest.fn().mockReturnThis() }
        queryFn(mockQ)
        const contentId = mockQ.where.mock.calls[0][1]

        return Promise.resolve({
          data: contentId === 416448
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

    test('award granted after completing lesson 2, regardless of kickoff status', async () => {
      db.contentProgress.queryOne.mockImplementation((queryFn) => {
        const mockQ = { where: jest.fn().mockReturnThis() }
        queryFn(mockQ)
        const contentId = mockQ.where.mock.calls[0][1]

        return Promise.resolve({
          data: contentId === 416448
            ? { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
            : { state: 'started', created_at: Math.floor(Date.now() / 1000) }
        })
      })

      awardEvents.on('awardGranted', awardGrantedListener)

      await awardManager.onContentCompleted(courseId)

      expect(awardGrantedListener).toHaveBeenCalledTimes(1)
    })
  })

  describe('Scenario: Course with has_kickoff=true and 5 lessons (417030=kickoff, 4 non-kickoff)', () => {
    const testAward = getAwardByContentId(417049)
    const courseId = 417049

    test('completing kickoff + 1 lesson shows 25% progress (1 of 4 after kickoff)', async () => {
      const completedLessonIds = [417045]

      db.contentProgress.queryOne.mockImplementation((queryFn) => {
        const mockQ = { where: jest.fn().mockReturnThis() }
        queryFn(mockQ)
        const contentId = mockQ.where.mock.calls[0][1]

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

    test('completing kickoff + 2 lessons shows 50% progress', async () => {
      const completedLessonIds = [417045, 417046]

      db.contentProgress.queryOne.mockImplementation((queryFn) => {
        const mockQ = { where: jest.fn().mockReturnThis() }
        queryFn(mockQ)
        const contentId = mockQ.where.mock.calls[0][1]

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

    test('must complete all 4 non-kickoff lessons to earn award', async () => {
      const completedLessonIds = [417045, 417046, 417047, 417048]

      db.contentProgress.queryOne.mockImplementation((queryFn) => {
        const mockQ = { where: jest.fn().mockReturnThis() }
        queryFn(mockQ)
        const contentId = mockQ.where.mock.calls[0][1]

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

  describe('Scenario: Large course with has_kickoff=true and 24 lessons (416465=kickoff, 23 non-kickoff)', () => {
    const testAward = getAwardByContentId(416464)
    const courseId = 416464
    const nonKickoffLessons = [
      416467, 416468, 416469, 416470, 416471, 416472, 416473,
      416474, 416475, 416476, 416477, 416478, 416479, 416480, 416481,
      416482, 416483, 416484, 416485, 416486, 416487, 416488, 416489
    ]

    test('completing only kickoff shows 0% progress', async () => {
      db.contentProgress.queryOne.mockImplementation((queryFn) => {
        const mockQ = { where: jest.fn().mockReturnThis() }
        queryFn(mockQ)
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

    test('completing 12 of 23 non-kickoff lessons shows ~52% progress', async () => {
      const completedLessonIds = nonKickoffLessons.slice(0, 12)

      db.contentProgress.queryOne.mockImplementation((queryFn) => {
        const mockQ = { where: jest.fn().mockReturnThis() }
        queryFn(mockQ)
        const contentId = mockQ.where.mock.calls[0][1]

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

    test('must complete all 23 non-kickoff lessons to earn award', async () => {
      db.contentProgress.queryOne.mockImplementation((queryFn) => {
        const mockQ = { where: jest.fn().mockReturnThis() }
        queryFn(mockQ)
        const contentId = mockQ.where.mock.calls[0][1]

        return Promise.resolve({
          data: nonKickoffLessons.includes(contentId)
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

  describe('Scenario: Course with has_kickoff=false should count all lessons', () => {
    const testAward = getAwardByContentId(417039)
    const courseId = 417039

    test('first lesson counts toward progress when no kickoff', async () => {
      const completedLessonIds = [417035]

      db.contentProgress.queryOne.mockImplementation((queryFn) => {
        const mockQ = { where: jest.fn().mockReturnThis() }
        queryFn(mockQ)
        const contentId = mockQ.where.mock.calls[0][1]

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

  describe('Scenario: Edge case - course with only kickoff lesson', () => {
    const testAward = getAwardByContentId(416446)
    const courseId = 416446

    test('course 416446 actually has 2 lessons (kickoff + 1 regular), so completing both grants award', async () => {
      db.contentProgress.queryOne.mockResolvedValue({
        data: { state: 'completed', created_at: Math.floor(Date.now() / 1000) }
      })

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
})
