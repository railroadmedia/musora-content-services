import {
  getSubtitle,
  getDefaultCTATextForContent,
} from '../../../src/services/progress-row/rows/content-card.js'

describe('getSubtitle', () => {
  describe('parent lesson types', () => {
    test.each([
      'course',
      'guided-course',
      'course-collection',
      'song-tutorial',
      'learning-path-v2',
      'skill-pack',
    ])('returns "X of Y Lessons Complete" for type %s', (type) => {
      const content = {
        type,
        completed_children: 3,
        all_children: 10,
      }
      expect(getSubtitle(content, 'course', false)).toBe('3 of 10 Lessons Complete')
    })

    test('uses 0 when completed_children is missing', () => {
      const content = { type: 'course', all_children: 8 }
      expect(getSubtitle(content, 'course', false)).toBe('0 of 8 Lessons Complete')
    })

    test('falls back to lesson_count when all_children missing', () => {
      const content = { type: 'course', completed_children: 2, lesson_count: 5 }
      expect(getSubtitle(content, 'course', false)).toBe('2 of 5 Lessons Complete')
    })

    test('falls back to child_count when all_children and lesson_count missing', () => {
      const content = { type: 'course', completed_children: 1, child_count: 4 }
      expect(getSubtitle(content, 'course', false)).toBe('1 of 4 Lessons Complete')
    })

    test('prefers all_children over lesson_count and child_count', () => {
      const content = {
        type: 'course',
        completed_children: 1,
        all_children: 9,
        lesson_count: 5,
        child_count: 7,
      }
      expect(getSubtitle(content, 'course', false)).toBe('1 of 9 Lessons Complete')
    })
  })

  describe('lesson_count > 1', () => {
    test('returns "X of Y Lessons Complete" when lesson_count > 1 even for non-parent type', () => {
      const content = {
        type: 'song',
        completed_children: 2,
        all_children: 6,
        lesson_count: 6,
      }
      expect(getSubtitle(content, 'song', false)).toBe('2 of 6 Lessons Complete')
    })

    test('does not trigger when lesson_count is 1', () => {
      const content = {
        type: 'song',
        lesson_count: 1,
        difficulty_string: 'Beginner',
        artist_name: 'Artist',
      }
      expect(getSubtitle(content, 'song', false)).toBe('Beginner • Artist')
    })

    test('does not trigger when lesson_count is 0', () => {
      const content = {
        type: 'song',
        lesson_count: 0,
        difficulty_string: 'Intermediate',
        artist_name: 'Band',
      }
      expect(getSubtitle(content, 'song', false)).toBe('Intermediate • Band')
    })
  })

  describe('lesson and show contentType', () => {
    test('returns "X% Complete" for lesson when not live', () => {
      const content = { type: 'course-lesson', progressPercentage: 42 }
      expect(getSubtitle(content, 'lesson', false)).toBe('42% Complete')
    })

    test('returns "X% Complete" for show when not live', () => {
      const content = { type: 'show-type', progressPercentage: 75 }
      expect(getSubtitle(content, 'show', false)).toBe('75% Complete')
    })

    test('returns "0% Complete" when progressPercentage is 0', () => {
      const content = { type: 'course-lesson', progressPercentage: 0 }
      expect(getSubtitle(content, 'lesson', false)).toBe('0% Complete')
    })

    test('falls through to difficulty/artist when lesson isLive=true', () => {
      const content = {
        type: 'course-lesson',
        progressPercentage: 80,
        difficulty_string: 'Advanced',
        artist_name: 'Live Artist',
      }
      expect(getSubtitle(content, 'lesson', true)).toBe('Advanced • Live Artist')
    })

    test('falls through to difficulty/artist when show isLive=true', () => {
      const content = {
        type: 'show-type',
        progressPercentage: 50,
        difficulty_string: 'Beginner',
        artist_name: 'Live Show',
      }
      expect(getSubtitle(content, 'show', true)).toBe('Beginner • Live Show')
    })
  })

  describe('default difficulty/artist subtitle', () => {
    test('returns "difficulty • artist" for song', () => {
      const content = {
        type: 'song',
        difficulty_string: 'Intermediate',
        artist_name: 'The Beatles',
      }
      expect(getSubtitle(content, 'song', false)).toBe('Intermediate • The Beatles')
    })

    test('returns "undefined • undefined" when fields missing', () => {
      const content = { type: 'song' }
      expect(getSubtitle(content, 'song', false)).toBe('undefined • undefined')
    })
  })

  describe('priority ordering', () => {
    test('parent-type rule wins over lesson contentType', () => {
      const content = {
        type: 'course',
        completed_children: 4,
        all_children: 12,
        progressPercentage: 33,
      }
      expect(getSubtitle(content, 'lesson', false)).toBe('4 of 12 Lessons Complete')
    })

    test('lesson_count>1 rule wins over lesson contentType', () => {
      const content = {
        type: 'song',
        lesson_count: 3,
        completed_children: 1,
        all_children: 3,
        progressPercentage: 33,
      }
      expect(getSubtitle(content, 'lesson', false)).toBe('1 of 3 Lessons Complete')
    })
  })
})

describe('getDefaultCTATextForContent', () => {
  describe('guided-course not started', () => {
    test('returns "Start Course" when progressStatus is undefined', () => {
      const content = { type: 'guided-course' }
      expect(getDefaultCTATextForContent(content, 'guided course')).toBe('Start Course')
    })

    test('returns "Start Course" when progressStatus is "not-started"', () => {
      const content = { type: 'guided-course', progressStatus: 'not-started' }
      expect(getDefaultCTATextForContent(content, 'guided course')).toBe('Start Course')
    })

    test('returns "Start Course" when progressPercentage is 0', () => {
      const content = {
        type: 'guided-course',
        progressStatus: 'started',
        progressPercentage: 0,
      }
      expect(getDefaultCTATextForContent(content, 'guided course')).toBe('Start Course')
    })

    test('returns "Continue" when guided-course is in-progress', () => {
      const content = {
        type: 'guided-course',
        progressStatus: 'started',
        progressPercentage: 25,
      }
      expect(getDefaultCTATextForContent(content, 'guided course')).toBe('Continue')
    })
  })

  describe('completed - song variants', () => {
    test.each([
      ['drumeo', 'transcription'],
      ['guitareo', 'tab'],
      ['pianote', 'sheet music'],
      ['singeo', 'sheet music'],
      ['playbass', 'tab'],
    ])('returns "Replay Song" when completed for brand %s with song contentType %s', (brand, contentType) => {
      const content = { type: 'song', brand, progressStatus: 'completed' }
      expect(getDefaultCTATextForContent(content, contentType)).toBe('Replay Song')
    })

    test('returns "Replay Song" when completed and contentType is "play along"', () => {
      const content = { type: 'play-along', brand: 'drumeo', progressStatus: 'completed' }
      expect(getDefaultCTATextForContent(content, 'play along')).toBe('Replay Song')
    })

    test('returns "Replay Song" when completed and contentType is "jam track"', () => {
      const content = { type: 'jam-track', brand: 'drumeo', progressStatus: 'completed' }
      expect(getDefaultCTATextForContent(content, 'jam track')).toBe('Replay Song')
    })

    test('does not return "Replay Song" when brand song contentType mismatches', () => {
      const content = { type: 'song', brand: 'drumeo', progressStatus: 'completed' }
      expect(getDefaultCTATextForContent(content, 'tab')).toBe('Continue')
    })
  })

  describe('completed - lesson/show', () => {
    test('returns "Revisit Lesson" when completed lesson', () => {
      const content = { type: 'course-lesson', progressStatus: 'completed' }
      expect(getDefaultCTATextForContent(content, 'lesson')).toBe('Revisit Lesson')
    })

    test('returns "Revisit Lesson" when completed show', () => {
      const content = { type: 'show-type', progressStatus: 'completed' }
      expect(getDefaultCTATextForContent(content, 'show')).toBe('Revisit Lesson')
    })
  })

  describe('completed - parent lesson types', () => {
    test.each([
      'course',
      'guided-course',
      'course-collection',
      'song-tutorial',
      'learning-path-v2',
      'skill-pack',
    ])('returns "Revisit Lessons" when completed for type %s', (type) => {
      const content = { type, progressStatus: 'completed' }
      expect(getDefaultCTATextForContent(content, 'course')).toBe('Revisit Lessons')
    })
  })

  describe('completed - other', () => {
    test('returns "Continue" when completed and no rule matches', () => {
      const content = { type: 'some-type', progressStatus: 'completed' }
      expect(getDefaultCTATextForContent(content, 'unknown')).toBe('Continue')
    })
  })

  describe('default fallback', () => {
    test('returns "Continue" when no progressStatus for non-guided-course', () => {
      const content = { type: 'song' }
      expect(getDefaultCTATextForContent(content, 'song')).toBe('Continue')
    })

    test('returns "Continue" when progressStatus is "started"', () => {
      const content = {
        type: 'course-lesson',
        progressStatus: 'started',
        progressPercentage: 50,
      }
      expect(getDefaultCTATextForContent(content, 'lesson')).toBe('Continue')
    })

    test('returns "Continue" when not-started and not guided-course', () => {
      const content = { type: 'course-lesson', progressStatus: 'not-started' }
      expect(getDefaultCTATextForContent(content, 'lesson')).toBe('Continue')
    })
  })

  describe('priority ordering', () => {
    test('guided-course not-started wins even when contentType is lesson', () => {
      const content = { type: 'guided-course', progressPercentage: 0 }
      expect(getDefaultCTATextForContent(content, 'lesson')).toBe('Start Course')
    })

    test('completed song-match wins over completed lesson contentType', () => {
      const content = { type: 'song', brand: 'drumeo', progressStatus: 'completed' }
      expect(getDefaultCTATextForContent(content, 'transcription')).toBe('Replay Song')
    })

    test('completed lesson contentType wins over parent-type rule', () => {
      const content = { type: 'course', progressStatus: 'completed' }
      expect(getDefaultCTATextForContent(content, 'lesson')).toBe('Revisit Lesson')
    })
  })
})
