// Mock sync module to prevent TypeScript compilation errors
jest.mock('../src/services/sync/index', () => ({}))
jest.mock('../src/services/sync/manager', () => ({}))
jest.mock('../src/services/sync/models/index', () => ({}))
jest.mock('../src/services/sync/repositories/index', () => ({}))
jest.mock('../src/services/sync/database/factory', () => ({}))

// Mock modules that use sync to prevent compilation errors
jest.mock('../src/services/user/streakCalculator', () => ({
  calculateStreak: jest.fn(),
  getStreakMessage: jest.fn()
}))
jest.mock('../src/services/contentProgress', () => ({
  ...jest.requireActual('../src/services/contentProgress'),
}))
jest.mock('../src/services/contentLikes', () => ({
  ...jest.requireActual('../src/services/contentLikes'),
}))
jest.mock('../src/services/userActivity', () => ({
  ...jest.requireActual('../src/services/userActivity'),
}))
jest.mock('../src/services/content-org/learning-paths', () => ({
  enrollInLearningPath: jest.fn(),
  getLearningPathProgress: jest.fn()
}))
jest.mock('../src/services/content-org/guided-courses', () => ({
  enrollInGuidedCourse: jest.fn()
}))

// Mock getSanityDate before other modules load to avoid circular dependency issues
jest.mock('../src/services/sanity.js', () => ({
  ...jest.requireActual('../src/services/sanity.js'),
  getSanityDate: jest.fn((date) => date.toISOString()),
  fetchSimilarItems: jest.fn(),
  fetchByRailContentIds: jest.fn(),
  fetchCourseCollectionData: jest.fn()
}))

jest.mock('../src/services/recommendations.js', () => ({
  ...jest.requireActual('../src/services/recommendations.js'),
  fetchSimilarItems: jest.fn()
}))

import { getEndScreen } from '../src/services/endScreen.js'
import * as recommendationsModule from '../src/services/recommendations.js'
import * as sanityModule from '../src/services/sanity.js'

describe('getEndScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Single Lessons', () => {
    test('single lesson without course returns countdown with RecSys recommendation', async () => {
      const mockRecommendation = { id: 999, type: 'lesson', title: 'Recommended Lesson' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 123, type: 'lesson' },
        course: null,
        collection: null,
        brand: 'drumeo'
      })

      expect(result).toEqual({
        variant: 'countdown-up-next',
        upNext: mockRecommendation,
        countdownAutoplay: true,
        ctaLabels: { primary: 'Play Now', secondary: 'Cancel' }
      })
      expect(recommendationsModule.fetchSimilarItems).toHaveBeenCalledWith(123, 'drumeo', 5)
    })

    test('single lesson returns null when RecSys returns empty array', async () => {
      mockFetchRecommendation([])

      const result = await getEndScreen({
        lesson: { id: 123, type: 'lesson' },
        brand: 'drumeo'
      })

      expect(result.upNext).toBeNull()
    })

    test('single lesson returns null when RecSys throws error', async () => {
      jest.spyOn(recommendationsModule, 'fetchSimilarItems').mockRejectedValue(new Error('API Error'))

      const result = await getEndScreen({
        lesson: { id: 123, type: 'lesson' },
        brand: 'drumeo'
      })

      expect(result.upNext).toBeNull()
    })
  })

  describe('Single Song Lessons (Play-Along and Jam Tracks)', () => {
    test('play-along lesson returns countdown with RecSys recommendation', async () => {
      const mockRecommendation = { id: 888, type: 'play-along', title: 'Recommended Play-Along' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 456, type: 'play-along' },
        course: null,
        brand: 'drumeo'
      })

      expect(result).toEqual({
        variant: 'countdown-up-next',
        upNext: mockRecommendation,
        countdownAutoplay: true,
        ctaLabels: { primary: 'Play Now', secondary: 'Cancel' }
      })
    })

    test('jam track lesson returns countdown with RecSys recommendation', async () => {
      const mockRecommendation = { id: 777, type: 'jam-track', title: 'Recommended Jam Track' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 789, type: 'jam-track' },
        course: null,
        brand: 'guitareo'
      })

      expect(result).toEqual({
        variant: 'countdown-up-next',
        upNext: mockRecommendation,
        countdownAutoplay: true,
        ctaLabels: { primary: 'Play Now', secondary: 'Cancel' }
      })
    })

    test('play-along inside course still uses RecSys (ignores course context)', async () => {
      const mockRecommendation = { id: 999, type: 'play-along' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 456, type: 'play-along' },
        course: { id: 100, children: [{ id: 456 }, { id: 457 }] },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('countdown-up-next')
      expect(result.upNext).toEqual(mockRecommendation)
      expect(recommendationsModule.fetchSimilarItems).toHaveBeenCalled()
    })
  })

  describe('Course - Not Last Lesson', () => {
    test('returns next lesson in course with countdown', async () => {
      const result = await getEndScreen({
        lesson: { id: 200, type: 'course-lesson' },
        course: {
          id: 100,
          children: [
            { id: 200, status: 'published' },
            { id: 201, status: 'published', title: 'Next Lesson' },
            { id: 202, status: 'published' }
          ]
        },
        brand: 'pianote'
      })

      expect(result).toEqual({
        variant: 'countdown-up-next',
        upNext: { id: 201, status: 'published', title: 'Next Lesson' },
        countdownAutoplay: true,
        ctaLabels: { primary: 'Play Now', secondary: 'Cancel' }
      })
    })

    test('skips unreleased lessons and returns next published lesson', async () => {
      const result = await getEndScreen({
        lesson: { id: 200, type: 'course-lesson' },
        course: {
          id: 100,
          children: [
            { id: 200, status: 'published' },
            { id: 201, status: 'draft' },
            { id: 202, status: 'published', title: 'Next Published Lesson' }
          ]
        },
        brand: 'drumeo'
      })

      expect(result.upNext).toEqual({ id: 202, status: 'published', title: 'Next Published Lesson' })
    })

    test('returns scheduled lessons as valid next lesson', async () => {
      const result = await getEndScreen({
        lesson: { id: 200, type: 'course-lesson' },
        course: {
          id: 100,
          children: [
            { id: 200, status: 'published' },
            { id: 201, status: 'scheduled', title: 'Scheduled Lesson' }
          ]
        },
        brand: 'drumeo'
      })

      expect(result.upNext).toEqual({ id: 201, status: 'scheduled', title: 'Scheduled Lesson' })
    })

    test('treats lessons without status as released', async () => {
      const result = await getEndScreen({
        lesson: { id: 200, type: 'course-lesson' },
        course: {
          id: 100,
          children: [
            { id: 200 },
            { id: 201, title: 'Next Lesson No Status' }
          ]
        },
        brand: 'drumeo'
      })

      expect(result.upNext).toEqual({ id: 201, title: 'Next Lesson No Status' })
    })
  })

  describe('Course - Last Lesson (Not in Collection)', () => {
    test('returns RecSys recommendation with course-complete variant', async () => {
      const mockRecommendation = { id: 888, type: 'course', title: 'Recommended Course' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 202, type: 'course-lesson' },
        course: {
          id: 100,
          children: [
            { id: 200, status: 'published' },
            { id: 201, status: 'published' },
            { id: 202, status: 'published' }
          ]
        },
        brand: 'drumeo'
      })

      expect(result).toEqual({
        variant: 'course-complete',
        upNext: mockRecommendation,
        countdownAutoplay: false,
        ctaLabels: { primary: 'Play Now', secondary: 'Back to Home' }
      })
    })

    test('last lesson with all remaining lessons being drafts uses RecSys', async () => {
      const mockRecommendation = { id: 999, type: 'course' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 200, type: 'course-lesson' },
        course: {
          id: 100,
          children: [
            { id: 200, status: 'published' },
            { id: 201, status: 'draft' },
            { id: 202, status: 'draft' }
          ]
        },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('course-complete')
      expect(result.upNext).toEqual(mockRecommendation)
    })
  })

  describe('Course Collection - Not Last Lesson in Course', () => {
    test('returns next lesson in same course with countdown', async () => {
      const result = await getEndScreen({
        lesson: { id: 300, type: 'course-lesson' },
        course: {
          id: 100,
          children: [
            { id: 300, status: 'published' },
            { id: 301, status: 'published', title: 'Next in Course' }
          ]
        },
        collection: {
          id: 10,
          type: 'course-collection',
          children: [
            { id: 100, children: [{ id: 300 }, { id: 301 }] },
            { id: 101, children: [{ id: 400 }] }
          ]
        },
        brand: 'drumeo'
      })

      expect(result).toEqual({
        variant: 'countdown-up-next',
        upNext: { id: 301, status: 'published', title: 'Next in Course' },
        countdownAutoplay: true,
        ctaLabels: { primary: 'Play Now', secondary: 'Cancel' }
      })
    })
  })

  describe('Course Collection - Last Lesson, Not Last Course', () => {
    test('returns first lesson of next course with course-complete (no autoplay)', async () => {
      const result = await getEndScreen({
        lesson: { id: 301, type: 'course-lesson' },
        course: {
          id: 100,
          children: [
            { id: 300, status: 'published' },
            { id: 301, status: 'published' }
          ]
        },
        collection: {
          id: 10,
          type: 'course-collection',
          children: [
            { id: 100, children: [{ id: 300 }, { id: 301 }] },
            { id: 101, children: [{ id: 400, title: 'First Lesson Next Course' }, { id: 401 }] }
          ]
        },
        brand: 'drumeo'
      })

      expect(result).toEqual({
        variant: 'course-complete',
        upNext: { id: 400, title: 'First Lesson Next Course' },
        countdownAutoplay: false,
        ctaLabels: { primary: 'Play Now', secondary: 'Back to Home' }
      })
    })

    test('fetches collection data if children not provided', async () => {
      const mockCollectionData = {
        id: 10,
        type: 'course-collection',
        children: [
          { id: 100, children: [{ id: 301 }] },
          { id: 101, children: [{ id: 400, title: 'Fetched Next Course First Lesson' }] }
        ]
      }
      jest.spyOn(sanityModule, 'fetchCourseCollectionData').mockResolvedValue(mockCollectionData)

      const result = await getEndScreen({
        lesson: { id: 301, type: 'course-lesson' },
        course: {
          id: 100,
          children: [{ id: 301 }]
        },
        collection: {
          id: 10,
          type: 'course-collection'
        },
        brand: 'drumeo'
      })

      expect(sanityModule.fetchCourseCollectionData).toHaveBeenCalledWith(10)
      expect(result.upNext).toEqual({ id: 400, title: 'Fetched Next Course First Lesson' })
    })
  })

  describe('Course Collection - Last Lesson, Last Course', () => {
    test('returns RecSys recommendation with course-complete', async () => {
      const mockRecommendation = { id: 999, type: 'course', title: 'Recommended After Collection' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 401, type: 'course-lesson' },
        course: {
          id: 101,
          children: [
            { id: 400, status: 'published' },
            { id: 401, status: 'published' }
          ]
        },
        collection: {
          id: 10,
          type: 'course-collection',
          children: [
            { id: 100, children: [{ id: 300 }, { id: 301 }] },
            { id: 101, children: [{ id: 400 }, { id: 401 }] }
          ]
        },
        brand: 'drumeo'
      })

      expect(result).toEqual({
        variant: 'course-complete',
        upNext: mockRecommendation,
        countdownAutoplay: false,
        ctaLabels: { primary: 'Play Now', secondary: 'Back to Home' }
      })
    })
  })

  describe('Playlists', () => {
    test('returns next item in playlist with countdown', async () => {
      const result = await getEndScreen({
        lesson: { id: 500, type: 'lesson' },
        playlist: {
          id: 10,
          items: [
            { id: 500, status: 'published' },
            { id: 501, status: 'published', title: 'Next in Playlist' },
            { id: 502, status: 'published' }
          ]
        },
        brand: 'drumeo'
      })

      expect(result).toEqual({
        variant: 'countdown-up-next',
        upNext: { id: 501, status: 'published', title: 'Next in Playlist' },
        countdownAutoplay: true,
        ctaLabels: { primary: 'Play Now', secondary: 'Cancel' }
      })
    })

    test('last item in playlist returns RecSys with course-complete variant', async () => {
      const mockRecommendation = { id: 999, type: 'lesson', title: 'Recommended After Playlist' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 502, type: 'lesson' },
        playlist: {
          id: 10,
          items: [
            { id: 500, status: 'published' },
            { id: 501, status: 'published' },
            { id: 502, status: 'published' }
          ]
        },
        brand: 'drumeo'
      })

      expect(result).toEqual({
        variant: 'course-complete',
        upNext: mockRecommendation,
        countdownAutoplay: false,
        ctaLabels: { primary: 'Play Now', secondary: 'Back to Home' }
      })
    })

    test('skips unreleased items in playlist', async () => {
      const result = await getEndScreen({
        lesson: { id: 500, type: 'lesson' },
        playlist: {
          id: 10,
          items: [
            { id: 500, status: 'published' },
            { id: 501, status: 'draft' },
            { id: 502, status: 'published', title: 'Next Published in Playlist' }
          ]
        },
        brand: 'drumeo'
      })

      expect(result.upNext).toEqual({ id: 502, status: 'published', title: 'Next Published in Playlist' })
    })

    test('handles playlist with empty items array', async () => {
      const mockRecommendation = { id: 999, type: 'lesson' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 500, type: 'lesson' },
        playlist: { id: 10, items: [] },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('course-complete')
      expect(result.upNext).toEqual(mockRecommendation)
    })

    test('handles playlist with undefined items', async () => {
      const mockRecommendation = { id: 999, type: 'lesson' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 500, type: 'lesson' },
        playlist: { id: 10 },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('course-complete')
    })

    test('handles item not found in playlist', async () => {
      const mockRecommendation = { id: 999, type: 'lesson' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 999, type: 'lesson' },
        playlist: {
          id: 10,
          items: [{ id: 500 }, { id: 501 }]
        },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('course-complete')
    })

    test('playlist takes precedence over course', async () => {
      const result = await getEndScreen({
        lesson: { id: 500, type: 'lesson' },
        course: {
          id: 100,
          children: [{ id: 500 }, { id: 600, title: 'Next in Course' }]
        },
        playlist: {
          id: 10,
          items: [{ id: 500 }, { id: 501, title: 'Next in Playlist' }]
        },
        brand: 'drumeo'
      })

      expect(result.upNext).toEqual({ id: 501, title: 'Next in Playlist' })
    })

    test('transcriptions in playlist still show end screen', async () => {
      const result = await getEndScreen({
        lesson: { id: 500, type: 'lesson' },
        playlist: {
          id: 10,
          items: [
            { id: 500, type: 'lesson' },
            { id: 501, type: 'transcription', title: 'Transcription Next' }
          ]
        },
        brand: 'drumeo'
      })

      expect(result.upNext).toEqual({ id: 501, type: 'transcription', title: 'Transcription Next' })
    })
  })

  describe('Edge Cases', () => {
    test('handles course with empty children array', async () => {
      const mockRecommendation = { id: 999, type: 'course' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 123, type: 'course-lesson' },
        course: { id: 100, children: [] },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('course-complete')
      expect(result.upNext).toEqual(mockRecommendation)
    })

    test('handles course with undefined children', async () => {
      const mockRecommendation = { id: 999, type: 'course' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 123, type: 'course-lesson' },
        course: { id: 100 },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('course-complete')
    })

    test('handles lesson not found in course children', async () => {
      const mockRecommendation = { id: 999, type: 'course' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 999, type: 'course-lesson' },
        course: {
          id: 100,
          children: [{ id: 200 }, { id: 201 }]
        },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('course-complete')
      expect(result.upNext).toEqual(mockRecommendation)
    })

    test('handles collection with empty children', async () => {
      const mockRecommendation = { id: 999, type: 'course' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 301, type: 'course-lesson' },
        course: {
          id: 100,
          children: [{ id: 301 }]
        },
        collection: {
          id: 10,
          type: 'course-collection',
          children: []
        },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('course-complete')
    })

    test('handles collection with undefined children', async () => {
      const mockRecommendation = { id: 999, type: 'course' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 301, type: 'course-lesson' },
        course: {
          id: 100,
          children: [{ id: 301 }]
        },
        collection: {
          id: 10,
          type: 'course-collection'
        },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('course-complete')
    })

    test('handles course not found in collection children', async () => {
      const mockRecommendation = { id: 999, type: 'course' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 301, type: 'course-lesson' },
        course: {
          id: 999,
          children: [{ id: 301 }]
        },
        collection: {
          id: 10,
          type: 'course-collection',
          children: [{ id: 100, children: [{ id: 300 }] }]
        },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('course-complete')
    })

    test('handles next course with empty children', async () => {
      const mockRecommendation = { id: 999, type: 'course' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 301, type: 'course-lesson' },
        course: {
          id: 100,
          children: [{ id: 301 }]
        },
        collection: {
          id: 10,
          type: 'course-collection',
          children: [
            { id: 100, children: [{ id: 301 }] },
            { id: 101, children: [] }
          ]
        },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('course-complete')
      expect(result.upNext).toEqual(mockRecommendation)
    })

    test('handles next course with undefined children', async () => {
      const mockRecommendation = { id: 999, type: 'course' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 301, type: 'course-lesson' },
        course: {
          id: 100,
          children: [{ id: 301 }]
        },
        collection: {
          id: 10,
          type: 'course-collection',
          children: [
            { id: 100, children: [{ id: 301 }] },
            { id: 101 }
          ]
        },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('course-complete')
    })

    test('handles non-course-collection collection type', async () => {
      const mockRecommendation = { id: 999, type: 'course' }
      mockFetchRecommendation([mockRecommendation])

      const result = await getEndScreen({
        lesson: { id: 301, type: 'course-lesson' },
        course: {
          id: 100,
          children: [{ id: 301 }]
        },
        collection: {
          id: 10,
          type: 'learning-path',
          children: [{ id: 100 }, { id: 101 }]
        },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('course-complete')
    })

    test('RecSys filters out content with parent_id', async () => {
      const mockContents = [
        { id: 888, parent_id: 100, type: 'course-lesson' },
        { id: 999, type: 'course', title: 'Standalone Course' }
      ]
      jest.spyOn(recommendationsModule, 'fetchSimilarItems').mockResolvedValue([888, 999])
      jest.spyOn(sanityModule, 'fetchByRailContentIds').mockResolvedValue(mockContents)

      const result = await getEndScreen({
        lesson: { id: 123, type: 'lesson' },
        brand: 'drumeo'
      })

      expect(result.upNext).toEqual({ id: 999, type: 'course', title: 'Standalone Course' })
    })

    test('RecSys returns null when all recommendations have parent_id', async () => {
      const mockContents = [
        { id: 888, parent_id: 100, type: 'course-lesson' },
        { id: 889, parent_id: 101, type: 'course-lesson' }
      ]
      jest.spyOn(recommendationsModule, 'fetchSimilarItems').mockResolvedValue([888, 889])
      jest.spyOn(sanityModule, 'fetchByRailContentIds').mockResolvedValue(mockContents)

      const result = await getEndScreen({
        lesson: { id: 123, type: 'lesson' },
        brand: 'drumeo'
      })

      expect(result.upNext).toBeNull()
    })
  })
})

// Helper function to mock fetchSimilarItems + fetchByRailContentIds
function mockFetchRecommendation(contents) {
  const ids = contents.map(c => c.id)
  jest.spyOn(recommendationsModule, 'fetchSimilarItems').mockResolvedValue(ids)
  jest.spyOn(sanityModule, 'fetchByRailContentIds').mockResolvedValue(contents)
}
