import { mockAwardDefinitions } from '../mockData/award-definitions'

jest.mock('../../src/services/sanity', () => ({
  default: {
    fetch: jest.fn()
  },
  fetchSanity: jest.fn()
}))

jest.mock('../../src/services/sync/repository-proxy', () => {
  const mockFns = {
    userAwardProgress: {
      getAll: jest.fn(),
      getByAwardId: jest.fn(),
      getAwardsForContent: jest.fn()
    }
  }
  return { default: mockFns, ...mockFns }
})

import sanityClient, { fetchSanity } from '../../src/services/sanity'
import db from '../../src/services/sync/repository-proxy'
import { awardDefinitions } from '../../src/services/awards/internal/award-definitions'
import { getCompletedAwards, getContentAwards, getInProgressAwards } from '../../src/services/awards/award-query'

describe('Award Query Message Generation', () => {
  beforeEach(async () => {
    jest.clearAllMocks()

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwardDefinitions)
    fetchSanity.mockResolvedValue(mockAwardDefinitions)

    await awardDefinitions.refresh()
  })

  afterEach(() => {
    awardDefinitions.clear()
  })

  describe('getCompletedAwards', () => {
    test('includes message in completionData for guided course awards', async () => {
      const mockProgress = [{
        award_id: 'award-1',
        progress_percentage: 100,
        completed_at: 1672531200,
        completion_data: {
          content_title: 'Blues Foundations',
          completed_at: '2023-01-01T00:00:00.000Z',
          days_user_practiced: 14,
          practice_minutes: 180
        }
      }]

      const mockDefinition = {
        _id: 'award-1',
        name: 'Blues Master',
        badge: 'https://example.com/badge.png',
        award: 'certificate',
        brand: 'drumeo',
        instructor_name: 'Mike Johnston',
        content_type: 'guided-course'
      }

      jest.spyOn(db.userAwardProgress, 'getAll').mockResolvedValue({
        data: mockProgress
      })

      jest.spyOn(awardDefinitions, 'getById').mockResolvedValue(mockDefinition)

      const awards = await getCompletedAwards()

      expect(awards).toHaveLength(1)
      expect(awards[0].completionData).toHaveProperty('message')
      expect(awards[0].completionData.message).toContain('Blues Foundations')
      expect(awards[0].completionData.message).toContain('14 days')
      expect(awards[0].completionData.message).toContain('180 minutes')
    })

    test('includes message in completionData for learning path awards', async () => {
      const mockProgress = [{
        award_id: 'award-2',
        progress_percentage: 100,
        completed_at: 1672531200,
        completion_data: {
          content_title: 'Jazz Essentials',
          completed_at: '2023-01-01T00:00:00.000Z',
          days_user_practiced: 30,
          practice_minutes: 450
        }
      }]

      const mockDefinition = {
        _id: 'award-2',
        name: 'Jazz Journey',
        badge: 'https://example.com/badge2.png',
        award: 'certificate',
        brand: 'pianote',
        instructor_name: 'Lisa Witt',
        content_type: 'learning-path-v2'
      }

      jest.spyOn(db.userAwardProgress, 'getAll').mockResolvedValue({
        data: mockProgress
      })

      jest.spyOn(awardDefinitions, 'getById').mockResolvedValue(mockDefinition)

      const awards = await getCompletedAwards()

      expect(awards).toHaveLength(1)
      expect(awards[0].completionData).toHaveProperty('message')
      expect(awards[0].completionData.message).toContain('Jazz Essentials')
      expect(awards[0].completionData.message).toContain('30 days')
      expect(awards[0].completionData.message).toContain('450 minutes')
    })

    test('uses correct practice statistics in message', async () => {
      const mockProgress = [{
        award_id: 'award-3',
        progress_percentage: 100,
        completed_at: 1672531200,
        completion_data: {
          content_title: 'Rock Foundations',
          completed_at: '2023-01-01T00:00:00.000Z',
          days_user_practiced: 7,
          practice_minutes: 90
        }
      }]

      const mockDefinition = {
        _id: 'award-3',
        name: 'Rock Star',
        badge: 'https://example.com/badge3.png',
        award: 'badge',
        brand: 'guitareo',
        instructor_name: 'Steve Stine',
        content_type: 'guided-course'
      }

      jest.spyOn(db.userAwardProgress, 'getAll').mockResolvedValue({
        data: mockProgress
      })

      jest.spyOn(awardDefinitions, 'getById').mockResolvedValue(mockDefinition)

      const awards = await getCompletedAwards()

      expect(awards[0].completionData.message).toContain('7 days')
      expect(awards[0].completionData.message).toContain('90 minutes')
      expect(awards[0].completionData.message).not.toContain('180 minutes')
    })

    test('handles awards with zero practice minutes', async () => {
      const mockProgress = [{
        award_id: 'award-4',
        progress_percentage: 100,
        completed_at: 1672531200,
        completion_data: {
          content_title: 'Quick Course',
          completed_at: '2023-01-01T00:00:00.000Z',
          days_user_practiced: 1,
          practice_minutes: 0
        }
      }]

      const mockDefinition = {
        _id: 'award-4',
        name: 'Quick Learner',
        badge: 'https://example.com/badge4.png',
        award: 'badge',
        brand: 'singeo',
        instructor_name: 'Camille van Niekerk',
        content_type: 'guided-course'
      }

      jest.spyOn(db.userAwardProgress, 'getAll').mockResolvedValue({
        data: mockProgress
      })

      jest.spyOn(awardDefinitions, 'getById').mockResolvedValue(mockDefinition)

      const awards = await getCompletedAwards()

      expect(awards[0].completionData.message).toContain('0 minutes')
      expect(awards[0].completionData.message).toContain('1 days')
    })
  })

  describe('getContentAwards', () => {
    test('includes message in completionData when award is completed', async () => {
      const mockDefinitions = [{
        _id: 'award-5',
        name: 'Content Award',
        badge: 'https://example.com/badge5.png',
        award: 'certificate',
        brand: 'drumeo',
        instructor_name: 'Jared Falk',
        content_type: 'guided-course'
      }]

      const mockProgress = new Map()
      mockProgress.set('award-5', {
        progress_percentage: 100,
        isCompleted: true,
        completed_at: 1672531200,
        completion_data: {
          content_title: 'Advanced Techniques',
          completed_at: '2023-01-01T00:00:00.000Z',
          days_user_practiced: 21,
          practice_minutes: 300
        }
      })

      jest.spyOn(db.userAwardProgress, 'getAwardsForContent').mockResolvedValue({
        definitions: mockDefinitions,
        progress: mockProgress
      })

      jest.spyOn(awardDefinitions, 'hasAwards').mockResolvedValue(true)

      const result = await getContentAwards(12345)

      expect(result.hasAwards).toBe(true)
      expect(result.awards).toHaveLength(1)
      expect(result.awards[0].completionData).toHaveProperty('message')
      expect(result.awards[0].completionData.message).toContain('21 days')
      expect(result.awards[0].completionData.message).toContain('300 minutes')
    })

    test('handles awards without completion data gracefully', async () => {
      const mockDefinitions = [{
        _id: 'award-6',
        name: 'In Progress Award',
        badge: 'https://example.com/badge6.png',
        award: 'badge',
        brand: 'pianote',
        instructor_name: 'Lisa Witt',
        content_type: 'learning-path-v2'
      }]

      const mockProgress = new Map()
      mockProgress.set('award-6', {
        progress_percentage: 50,
        isCompleted: false,
        completed_at: null,
        completion_data: null
      })

      jest.spyOn(db.userAwardProgress, 'getAwardsForContent').mockResolvedValue({
        definitions: mockDefinitions,
        progress: mockProgress
      })

      jest.spyOn(awardDefinitions, 'hasAwards').mockResolvedValue(true)

      const result = await getContentAwards(12345)

      expect(result.hasAwards).toBe(true)
      expect(result.awards).toHaveLength(1)
      expect(result.awards[0].completionData).toBeNull()
    })
  })

  describe('getInProgressAwards', () => {
    test('handles in-progress awards with partial completion data', async () => {
      const mockProgress = [{
        award_id: 'award-7',
        progress_percentage: 75,
        completed_at: null,
        completion_data: {
          content_title: 'Intermediate Skills',
          completed_at: null,
          days_user_practiced: 10,
          practice_minutes: 150
        }
      }]

      const mockDefinition = {
        _id: 'award-7',
        name: 'Progress Champion',
        badge: 'https://example.com/badge7.png',
        award: 'badge',
        brand: 'guitareo',
        instructor_name: 'Anders Mouridsen',
        content_type: 'guided-course'
      }

      jest.spyOn(db.userAwardProgress, 'getAll').mockResolvedValue({
        data: mockProgress
      })

      jest.spyOn(awardDefinitions, 'getById').mockResolvedValue(mockDefinition)

      const awards = await getInProgressAwards()

      expect(awards).toHaveLength(1)
      expect(awards[0].isCompleted).toBe(false)
      expect(awards[0].completionData).toHaveProperty('message')
      expect(awards[0].completionData.message).toContain('10 days')
      expect(awards[0].completionData.message).toContain('150 minutes')
    })

    test('handles in-progress awards without completion data', async () => {
      const mockProgress = [{
        award_id: 'award-8',
        progress_percentage: 25,
        completed_at: null,
        completion_data: null
      }]

      const mockDefinition = {
        _id: 'award-8',
        name: 'Just Started',
        badge: 'https://example.com/badge8.png',
        award: 'badge',
        brand: 'singeo',
        instructor_name: 'Ramsey Voice Studio',
        content_type: 'learning-path-v2'
      }

      jest.spyOn(db.userAwardProgress, 'getAll').mockResolvedValue({
        data: mockProgress
      })

      jest.spyOn(awardDefinitions, 'getById').mockResolvedValue(mockDefinition)

      const awards = await getInProgressAwards()

      expect(awards).toHaveLength(1)
      expect(awards[0].completionData).toBeNull()
    })
  })

  describe('Award type determination', () => {
    test('generates message with content title for guided-course type', async () => {
      const mockProgress = [{
        award_id: 'gc-award',
        progress_percentage: 100,
        completed_at: 1672531200,
        completion_data: {
          content_title: 'Test Course',
          completed_at: '2023-01-01T00:00:00.000Z',
          days_user_practiced: 5,
          practice_minutes: 60
        }
      }]

      const mockDefinition = {
        _id: 'gc-award',
        name: 'Guided Course Award',
        badge: 'https://example.com/gc-badge.png',
        award: 'certificate',
        brand: 'drumeo',
        instructor_name: 'Test Instructor',
        content_type: 'guided-course'
      }

      jest.spyOn(db.userAwardProgress, 'getAll').mockResolvedValue({
        data: mockProgress
      })

      jest.spyOn(awardDefinitions, 'getById').mockResolvedValue(mockDefinition)

      const awards = await getCompletedAwards()

      expect(awards[0].completionData.message).toContain('Test Course')
    })

    test('generates message with content title for learning-path-v2 type', async () => {
      const mockProgress = [{
        award_id: 'lp-award',
        progress_percentage: 100,
        completed_at: 1672531200,
        completion_data: {
          content_title: 'Test Path',
          completed_at: '2023-01-01T00:00:00.000Z',
          days_user_practiced: 5,
          practice_minutes: 60
        }
      }]

      const mockDefinition = {
        _id: 'lp-award',
        name: 'Learning Path Award',
        badge: 'https://example.com/lp-badge.png',
        award: 'certificate',
        brand: 'pianote',
        instructor_name: 'Test Instructor',
        content_type: 'learning-path-v2'
      }

      jest.spyOn(db.userAwardProgress, 'getAll').mockResolvedValue({
        data: mockProgress
      })

      jest.spyOn(awardDefinitions, 'getById').mockResolvedValue(mockDefinition)

      const awards = await getCompletedAwards()

      expect(awards[0].completionData.message).toContain('Test Path')
    })

    test('generates message for unknown content types', async () => {
      const mockProgress = [{
        award_id: 'unknown-award',
        progress_percentage: 100,
        completed_at: 1672531200,
        completion_data: {
          content_title: 'Test Content',
          completed_at: '2023-01-01T00:00:00.000Z',
          days_user_practiced: 5,
          practice_minutes: 60
        }
      }]

      const mockDefinition = {
        _id: 'unknown-award',
        name: 'Unknown Type Award',
        badge: 'https://example.com/unknown-badge.png',
        award: 'certificate',
        brand: 'guitareo',
        instructor_name: 'Test Instructor',
        content_type: 'some-unknown-type'
      }

      jest.spyOn(db.userAwardProgress, 'getAll').mockResolvedValue({
        data: mockProgress
      })

      jest.spyOn(awardDefinitions, 'getById').mockResolvedValue(mockDefinition)

      const awards = await getCompletedAwards()

      expect(awards[0].completionData.message).toContain('Test Content')
    })
  })
})
