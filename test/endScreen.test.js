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

jest.mock('../src/services/contentAggregator.js', () => ({
  addContextToContent: jest.fn(async (getter) => getter()),
}))

import { getEndScreen, getLearningPathEndScreen } from '../src/services/endScreen/endScreen.ts'
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
      expect(recommendationsModule.fetchSimilarItems).toHaveBeenCalledWith(123, 'drumeo', 50)
    })

    test('single lesson uses fallback lesson when RecSys returns empty array', async () => {
      const fallbackLesson = { id: 373201, type: 'lesson', title: 'Fallback Lesson' }
      jest.spyOn(recommendationsModule, 'fetchSimilarItems').mockResolvedValue([])
      jest.spyOn(sanityModule, 'fetchByRailContentIds').mockResolvedValue([fallbackLesson])

      const result = await getEndScreen({
        lesson: { id: 123, type: 'lesson' },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('countdown-up-next')
      expect(result.upNext).toEqual(fallbackLesson)
    })

    test('single lesson returns null upNext when RecSys throws error', async () => {
      jest.spyOn(recommendationsModule, 'fetchSimilarItems').mockRejectedValue(new Error('API Error'))

      const result = await getEndScreen({
        lesson: { id: 123, type: 'lesson' },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('countdown-up-next')
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

    test('RecSys filters out lessons from the same course (parent_id === excludeId)', async () => {
      // Course 100 is finished (lesson 301 is last). excludeId = course.id = 100.
      // id 888 belongs to course 100 → filtered out. id 999 has no parent → returned.
      const mockContents = [
        { id: 888, parent_id: 100, type: 'course-lesson' },
        { id: 999, type: 'course', title: 'Standalone Course' }
      ]
      jest.spyOn(recommendationsModule, 'fetchSimilarItems').mockResolvedValue([888, 999])
      jest.spyOn(sanityModule, 'fetchByRailContentIds').mockResolvedValue(mockContents)

      const result = await getEndScreen({
        lesson: { id: 301, type: 'course-lesson' },
        course: { id: 100, children: [{ id: 301 }] },
        brand: 'drumeo'
      })

      expect(result.variant).toBe('course-complete')
      expect(result.upNext).toEqual({ id: 999, type: 'course', title: 'Standalone Course' })
    })

    test('RecSys returns null when all recommendations belong to the same course', async () => {
      // All items have parent_id === excludeId (course 100) → none pass the filter → null
      const mockContents = [
        { id: 888, parent_id: 100, type: 'course-lesson' },
        { id: 889, parent_id: 100, type: 'course-lesson' }
      ]
      jest.spyOn(recommendationsModule, 'fetchSimilarItems').mockResolvedValue([888, 889])
      jest.spyOn(sanityModule, 'fetchByRailContentIds').mockResolvedValue(mockContents)

      const result = await getEndScreen({
        lesson: { id: 301, type: 'course-lesson' },
        course: { id: 100, children: [{ id: 301 }] },
        brand: 'drumeo'
      })

      expect(result.upNext).toBeNull()
    })
  })
})

describe('getLearningPathEndScreen', () => {
  const lesson = { id: 101 }

  const makeLP = (overrides = {}) => ({
    children: [
      { id: 101, progressStatus: 'completed' },
      { id: 102, progressStatus: '' },
      { id: 103, progressStatus: '' },
    ],
    is_active_learning_path: true,
    learning_path_dailies: [
      { id: 101, progressStatus: 'completed' },
      { id: 102, progressStatus: '' },
    ],
    ...overrides,
  })

  describe('path-complete', () => {
    test('returns path-complete when all lessons are completed and lesson was not previously completed', () => {
      const lp = makeLP({
        children: [
          { id: 101, progressStatus: 'completed' },
          { id: 102, progressStatus: 'completed' },
        ],
        learning_path_dailies: [{ id: 101, progressStatus: 'completed' }],
      })

      const result = getLearningPathEndScreen({ lesson, learningPath: lp })

      expect(result).toEqual({
        variant: 'path-complete',
        upNext: null,
        countdownAutoplay: false,
        ctaLabels: { primary: 'View Achievement', secondary: 'Back to Home' },
      })
    })

    test('does NOT return path-complete when lesson was previously completed', () => {
      const lp = makeLP({
        children: [
          { id: 101, progressStatus: 'completed' },
          { id: 102, progressStatus: 'completed' },
        ],
        learning_path_dailies: [],
      })

      const result = getLearningPathEndScreen({ lesson, learningPath: lp, lessonWasPreviouslyCompleted: true })

      expect(result.variant).not.toBe('path-complete')
    })
  })

  describe('all dailies done on active LP → countdown-up-next', () => {
    test('returns countdown with first incomplete lesson in path when all dailies are done', () => {
      const lp = makeLP({
        learning_path_dailies: [
          { id: 101, progressStatus: 'completed' },
          { id: 102, progressStatus: 'completed' },
        ],
      })

      const result = getLearningPathEndScreen({ lesson, learningPath: lp })

      expect(result.variant).toBe('countdown-up-next')
      // children default: [101 completed, 102 '', 103 ''] → first incomplete is 102
      expect(result.upNext).toMatchObject({ id: 102 })
      expect(result.countdownAutoplay).toBe(true)
    })

    test('returns countdown regardless of lessonWasPreviouslyCompleted when dailies are done', () => {
      const lp = makeLP({
        learning_path_dailies: [
          { id: 101, progressStatus: 'completed' },
          { id: 102, progressStatus: 'completed' },
        ],
      })

      const result = getLearningPathEndScreen({ lesson, learningPath: lp, lessonWasPreviouslyCompleted: true })

      expect(result.variant).toBe('countdown-up-next')
    })

    test('non-active LP with all dailies done also returns countdown', () => {
      const lp = makeLP({
        is_active_learning_path: false,
        learning_path_dailies: [
          { id: 101, progressStatus: 'completed' },
          { id: 102, progressStatus: 'completed' },
        ],
      })

      const result = getLearningPathEndScreen({ lesson, learningPath: lp })

      expect(result.variant).toBe('countdown-up-next')
    })
  })

  describe('what-to-do-today (next daily lesson)', () => {
    test('returns what-to-do-today with next incomplete daily lesson', () => {
      const nextDaily = { id: 102, progressStatus: '' }
      const lp = makeLP({
        learning_path_dailies: [
          { id: 101, progressStatus: 'completed' },
          nextDaily,
        ],
      })

      const result = getLearningPathEndScreen({ lesson, learningPath: lp })

      expect(result).toEqual({
        variant: 'what-to-do-today',
        upNext: nextDaily,
        countdownAutoplay: true,
        ctaLabels: { primary: 'Play Now', secondary: 'Cancel' },
      })
    })

    test('returns what-to-do-today even if lesson was previously completed', () => {
      const nextDaily = { id: 102, progressStatus: '' }
      const lp = makeLP({
        learning_path_dailies: [
          { id: 101, progressStatus: 'completed' },
          nextDaily,
        ],
      })

      const result = getLearningPathEndScreen({ lesson, learningPath: lp, lessonWasPreviouslyCompleted: true })

      expect(result.variant).toBe('what-to-do-today')
      expect(result.upNext).toEqual(nextDaily)
    })
  })

  describe('countdown-up-next (next lesson in path, fallback)', () => {
    test('returns next lesson in path when LP is not active', () => {
      const lp = makeLP({ is_active_learning_path: false })

      const result = getLearningPathEndScreen({ lesson, learningPath: lp })

      expect(result).toEqual({
        variant: 'countdown-up-next',
        upNext: { id: 102, progressStatus: '' },
        countdownAutoplay: true,
        ctaLabels: { primary: 'Play Now', secondary: 'Cancel' },
      })
    })

    test('non-active LP: wraps to first lesson when current is last in path', () => {
      const lp = makeLP({
        children: [
          { id: 100, progressStatus: '' },
          { id: 101, progressStatus: 'completed' },
        ],
        is_active_learning_path: false,
        learning_path_dailies: [],
      })

      const result = getLearningPathEndScreen({ lesson, learningPath: lp })

      expect(result.variant).toBe('countdown-up-next')
      expect(result.upNext).toEqual({ id: 100, progressStatus: '' })
    })

    test('active LP: returns first incomplete lesson regardless of position', () => {
      const lp = makeLP({
        learning_path_dailies: [
          { id: 200, progressStatus: 'completed' },
          { id: 201, progressStatus: 'completed' },
        ],
      })

      const result = getLearningPathEndScreen({ lesson, learningPath: lp })

      expect(result.variant).toBe('countdown-up-next')
      expect(result.upNext).toEqual({ id: 102, progressStatus: '' })
    })
  })

  describe('< 3 dailies: combines previous + current + next LP dailies', () => {
    test('all combined dailies done (lesson from previous LP) → countdown-up-next with next in path', () => {
      const lessonFromPrevious = { id: 50, type: 'lesson' }
      const lp = makeLP({
        learning_path_dailies: [{ id: 101, progressStatus: 'completed' }],
        previous_learning_path_dailies: [{ id: 50, progressStatus: 'completed' }],
        next_learning_path_dailies: [],
      })

      const result = getLearningPathEndScreen({ lesson: lessonFromPrevious, learningPath: lp })

      expect(result.variant).toBe('countdown-up-next')
      expect(result.upNext).toMatchObject({ id: 102 })
    })

    test('next LP lessons are excluded from dailyLessonsCompleted check → falls through to countdown', () => {
      const lp = makeLP({
        learning_path_dailies: [{ id: 101, progressStatus: 'completed' }],
        previous_learning_path_dailies: [],
        next_learning_path_dailies: [{ id: 200, progressStatus: '' }],
      })

      // current dailies are all done; incomplete next LP lesson doesn't block countdown
      const result = getLearningPathEndScreen({ lesson, learningPath: lp })

      expect(result.variant).toBe('countdown-up-next')
      expect(result.upNext).toMatchObject({ id: 102 })
    })

    test('countdown shows next LP daily when current lesson is last before it and session not done', () => {
      // Combined list: [100 (incomplete), 101 (completed), 200 (next LP)]
      // lesson 101 is at index 1, next in combined list is 200 (next LP)
      // 100 is still incomplete → dailyLessonsCompleted = false → enters !dailyLessonsCompleted branch
      const lp = makeLP({
        learning_path_dailies: [{ id: 100, progressStatus: '' }, { id: 101, progressStatus: 'completed' }],
        previous_learning_path_dailies: [],
        next_learning_path_dailies: [{ id: 200, progressStatus: '' }],
      })

      const result = getLearningPathEndScreen({ lesson, learningPath: lp })

      expect(result.variant).toBe('what-to-do-today')
      expect(result.upNext).toMatchObject({ id: 200 })
    })
  })

  describe('edge cases', () => {
    test('handles empty children array', () => {
      const lp = makeLP({ children: [], is_active_learning_path: false })

      const result = getLearningPathEndScreen({ lesson, learningPath: lp })

      expect(result.variant).toBe('countdown-up-next')
      expect(result.upNext).toBeNull()
    })

    test('handles empty dailies array on active LP', () => {
      const lp = makeLP({ learning_path_dailies: [] })

      const result = getLearningPathEndScreen({ lesson, learningPath: lp })

      expect(result.variant).toBe('countdown-up-next')
      expect(result.upNext).toEqual({ id: 102, progressStatus: '' })
    })

    test('handles undefined children and dailies', () => {
      const lp = { is_active_learning_path: false }

      const result = getLearningPathEndScreen({ lesson, learningPath: lp })

      expect(result.variant).toBe('countdown-up-next')
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
