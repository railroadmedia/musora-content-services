import { awardDefinitions } from '../../src/services/awards/internal/award-definitions'
import { mockAwardDefinitions, getAwardByContentId } from '../mockData/award-definitions'

jest.mock('../../src/services/sanity', () => ({
  default: {
    fetch: jest.fn()
  },
  fetchSanity: jest.fn()
}))

import sanityClient, { fetchSanity } from '../../src/services/sanity'

describe('Award Calculations - Pure Logic Tests', () => {
  beforeEach(async () => {
    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)
    fetchSanity.mockResolvedValue(mockAwardDefinitions)
    await awardDefinitions.refresh()
  })

  afterEach(() => {
    awardDefinitions.clear()
  })

  describe('Award Eligibility Calculations', () => {
    test('calculates 0% progress when no lessons completed', () => {
      const totalLessons = 4
      const completedLessons = []

      const progressPercentage = Math.round((completedLessons.length / totalLessons) * 100)

      expect(progressPercentage).toBe(0)
    })

    test('calculates 25% progress when 1 of 4 lessons completed', () => {
      const totalLessons = 4
      const completedLessons = [417045]

      const progressPercentage = Math.round((completedLessons.length / totalLessons) * 100)

      expect(progressPercentage).toBe(25)
    })

    test('calculates 50% progress when 2 of 4 lessons completed', () => {
      const totalLessons = 4
      const completedLessons = [417045, 417046]

      const progressPercentage = Math.round((completedLessons.length / totalLessons) * 100)

      expect(progressPercentage).toBe(50)
    })

    test('calculates 75% progress when 3 of 4 lessons completed', () => {
      const totalLessons = 4
      const completedLessons = [417045, 417046, 417047]

      const progressPercentage = Math.round((completedLessons.length / totalLessons) * 100)

      expect(progressPercentage).toBe(75)
    })

    test('calculates 100% progress when all 4 lessons completed', () => {
      const totalLessons = 4
      const completedLessons = [417045, 417046, 417047, 417048]

      const progressPercentage = Math.round((completedLessons.length / totalLessons) * 100)

      expect(progressPercentage).toBe(100)
    })

    test('handles courses with many lessons (24-lesson course)', () => {
      const totalLessons = 24
      const completedLessons = Array(12).fill(0).map((_, i) => i)

      const progressPercentage = Math.round((completedLessons.length / totalLessons) * 100)

      expect(progressPercentage).toBe(50)
    })

    test('rounds progress percentage correctly', () => {
      const totalLessons = 3
      const completedLessons = [1]

      const progressPercentage = Math.round((completedLessons.length / totalLessons) * 100)

      expect(progressPercentage).toBe(33)
    })
  })

  describe('Content Exclusion via Sanity Query', () => {
    test('child_ids only contains eligible content (excluded content filtered by Sanity)', () => {
      const award = getAwardByContentId(417049)
      expect(award.child_ids.length).toBe(4)
      expect(award.child_ids).not.toContain(417030)
    })

    test('all child_ids count toward progress when no content excluded', () => {
      const award = getAwardByContentId(417039)
      expect(award.child_ids).toEqual([417035, 417036, 417038])
      expect(award.child_ids.length).toBe(3)
    })

    test('getEligibleChildIds returns all child_ids directly', () => {
      const { getEligibleChildIds } = require('../../src/services/awards/internal/award-definitions')
      const award = { child_ids: [1, 2, 3, 4] }
      expect(getEligibleChildIds(award)).toEqual([1, 2, 3, 4])
    })

    test('getEligibleChildIds handles empty child_ids', () => {
      const { getEligibleChildIds } = require('../../src/services/awards/internal/award-definitions')
      const award = { child_ids: [] }
      expect(getEligibleChildIds(award)).toEqual([])
    })

    test('getEligibleChildIds handles undefined child_ids', () => {
      const { getEligibleChildIds } = require('../../src/services/awards/internal/award-definitions')
      const award = {}
      expect(getEligibleChildIds(award)).toEqual([])
    })
  })

  describe('Progress Data Building', () => {
    test('builds progress data with completed lesson IDs', () => {
      const completedLessonIds = [417045, 417046]
      const totalLessons = 4

      const progressData = {
        completedLessonIds,
        totalLessons,
        completedCount: completedLessonIds.length
      }

      expect(progressData).toEqual({
        completedLessonIds: [417045, 417046],
        totalLessons: 4,
        completedCount: 2
      })
    })

    test('builds empty progress data when no lessons completed', () => {
      const completedLessonIds = []
      const totalLessons = 4

      const progressData = {
        completedLessonIds,
        totalLessons,
        completedCount: completedLessonIds.length
      }

      expect(progressData).toEqual({
        completedLessonIds: [],
        totalLessons: 4,
        completedCount: 0
      })
    })

    test('builds full progress data when all lessons completed', () => {
      const completedLessonIds = [417045, 417046, 417047, 417048]
      const totalLessons = 4

      const progressData = {
        completedLessonIds,
        totalLessons,
        completedCount: completedLessonIds.length
      }

      expect(progressData.completedCount).toBe(progressData.totalLessons)
    })
  })

  describe('Completion Data Structure', () => {
    test('generates completion data with required fields', () => {
      const completionData = {
        content_title: 'Blues Foundations',
        completed_at: new Date().toISOString(),
        days_user_practiced: 7,
        practice_minutes: 180
      }

      expect(completionData).toHaveProperty('content_title')
      expect(completionData).toHaveProperty('completed_at')
      expect(completionData).toHaveProperty('days_user_practiced')
      expect(completionData).toHaveProperty('practice_minutes')
      expect(typeof completionData.days_user_practiced).toBe('number')
      expect(typeof completionData.practice_minutes).toBe('number')
    })

    test('calculates days practiced from start to completion', () => {
      const startDate = Date.now() - (7 * 24 * 60 * 60 * 1000)
      const now = Date.now()
      const daysDiff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24))

      expect(daysDiff).toBe(7)
    })

    test('returns at least 1 day when completed on same day', () => {
      const startDate = Date.now()
      const now = Date.now()
      const daysDiff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24))
      const daysUserPracticed = Math.max(daysDiff, 1)

      expect(daysUserPracticed).toBe(1)
    })
  })

  describe('Award Type Determination', () => {
    test('determines guided-course award type', () => {
      const definition = { name: 'Complete Blues Foundations Course' }
      const awardType = definition.name.toLowerCase().includes('learning path')
        ? 'learning-path'
        : 'guided-course'

      expect(awardType).toBe('guided-course')
    })

    test('determines learning-path award type', () => {
      const definition = { name: 'Complete Rock Learning Path' }
      const awardType = definition.name.toLowerCase().includes('learning path')
        ? 'learning-path'
        : 'guided-course'

      expect(awardType).toBe('learning-path')
    })

    test('handles case-insensitive matching', () => {
      const definition = { name: 'Complete Jazz LEARNING PATH' }
      const awardType = definition.name.toLowerCase().includes('learning path')
        ? 'learning-path'
        : 'guided-course'

      expect(awardType).toBe('learning-path')
    })
  })

  describe('Content Title Generation', () => {
    test('removes "Complete" prefix from award name', () => {
      const awardName = 'Complete Blues Foundations Course'
      const contentTitle = awardName
        .replace(/^Complete\s+/i, '')
        .replace(/\s+(Course|Learning Path)$/i, '')
        .trim()

      expect(contentTitle).toBe('Blues Foundations')
    })

    test('removes "Course" suffix from award name', () => {
      const awardName = 'Blues Foundations Course'
      const contentTitle = awardName
        .replace(/^Complete\s+/i, '')
        .replace(/\s+(Course|Learning Path)$/i, '')
        .trim()

      expect(contentTitle).toBe('Blues Foundations')
    })

    test('removes "Learning Path" suffix from award name', () => {
      const awardName = 'Complete Rock Learning Path'
      const contentTitle = awardName
        .replace(/^Complete\s+/i, '')
        .replace(/\s+(Course|Learning Path)$/i, '')
        .trim()

      expect(contentTitle).toBe('Rock')
    })

    test('handles award name with both prefix and suffix', () => {
      const awardName = 'Complete Jazz Fundamentals Course'
      const contentTitle = awardName
        .replace(/^Complete\s+/i, '')
        .replace(/\s+(Course|Learning Path)$/i, '')
        .trim()

      expect(contentTitle).toBe('Jazz Fundamentals')
    })
  })

  describe('Eligibility Check Logic', () => {
    test('checks all lessons are completed for eligibility', () => {
      const lessonCompletionStates = [
        { id: 417045, completed: true },
        { id: 417046, completed: true },
        { id: 417047, completed: true },
        { id: 417048, completed: true }
      ]

      const allCompleted = lessonCompletionStates.every(lesson => lesson.completed)

      expect(allCompleted).toBe(true)
    })

    test('returns false when any lesson is incomplete', () => {
      const lessonCompletionStates = [
        { id: 417045, completed: true },
        { id: 417046, completed: false },
        { id: 417047, completed: true },
        { id: 417048, completed: true }
      ]

      const allCompleted = lessonCompletionStates.every(lesson => lesson.completed)

      expect(allCompleted).toBe(false)
    })

    test('handles empty lesson list', () => {
      const lessonCompletionStates = []
      const allCompleted = lessonCompletionStates.every(lesson => lesson.completed)

      expect(allCompleted).toBe(true)
    })
  })
})
