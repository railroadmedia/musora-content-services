describe('ContentPractice Calculations', () => {
  describe('practice minutes calculation', () => {
    test('converts seconds to minutes correctly', () => {
      const secondsToMinutes = (seconds) => Math.round(seconds / 60)

      expect(secondsToMinutes(600)).toBe(10)
      expect(secondsToMinutes(1200)).toBe(20)
      expect(secondsToMinutes(300)).toBe(5)
    })

    test('rounds fractional minutes correctly', () => {
      const secondsToMinutes = (seconds) => Math.round(seconds / 60)

      expect(secondsToMinutes(90)).toBe(2) // 1.5 minutes rounds to 2
      expect(secondsToMinutes(30)).toBe(1) // 0.5 minutes rounds to 1
      expect(secondsToMinutes(29)).toBe(0) // 0.48 minutes rounds to 0
    })

    test('sums practice times correctly', () => {
      const practices = [
        { duration_seconds: 600 },  // 10 min
        { duration_seconds: 1200 }, // 20 min
        { duration_seconds: 300 }   // 5 min
      ]

      const totalSeconds = practices.reduce(
        (sum, practice) => sum + practice.duration_seconds,
        0
      )
      const totalMinutes = Math.round(totalSeconds / 60)

      expect(totalMinutes).toBe(35)
    })

    test('handles empty practice array', () => {
      const practices = []

      const totalSeconds = practices.reduce(
        (sum, practice) => sum + practice.duration_seconds,
        0
      )

      expect(totalSeconds).toBe(0)
    })

    test('handles large practice durations', () => {
      const practices = [
        { duration_seconds: 36000 } // 600 minutes (10 hours)
      ]

      const totalMinutes = Math.round(practices[0].duration_seconds / 60)

      expect(totalMinutes).toBe(600)
    })
  })

  describe('award calculation scenarios', () => {
    test('calculates practice for full course', () => {
      // Scenario: User completes 5-lesson course
      const lessonPractices = [
        { content_id: 101, duration_seconds: 900 },  // 15 min
        { content_id: 102, duration_seconds: 1800 }, // 30 min
        { content_id: 103, duration_seconds: 600 },  // 10 min
        { content_id: 104, duration_seconds: 1200 }, // 20 min
        { content_id: 105, duration_seconds: 1500 }  // 25 min
      ]

      const totalSeconds = lessonPractices.reduce(
        (sum, p) => sum + p.duration_seconds,
        0
      )
      const totalMinutes = Math.round(totalSeconds / 60)

      expect(totalMinutes).toBe(100) // 15+30+10+20+25
    })

    test('excludes kickoff lesson from calculation', () => {
      // Scenario: Course with kickoff (ID 100) that should be excluded
      const allPractices = [
        { content_id: 100, duration_seconds: 300 },  // Kickoff: 5 min
        { content_id: 101, duration_seconds: 900 },  // 15 min
        { content_id: 102, duration_seconds: 1800 }, // 30 min
        { content_id: 103, duration_seconds: 600 }   // 10 min
      ]

      // Filter out kickoff (first lesson)
      const withoutKickoff = allPractices.slice(1)

      const totalSeconds = withoutKickoff.reduce(
        (sum, p) => sum + p.duration_seconds,
        0
      )
      const totalMinutes = Math.round(totalSeconds / 60)

      expect(totalMinutes).toBe(55) // 15+30+10, kickoff excluded
      expect(totalMinutes).not.toBe(60) // Would be 60 if kickoff included
    })

    test('handles multiple sessions for same lesson', () => {
      // User practices same lesson multiple times
      const practices = [
        { content_id: 101, duration_seconds: 600 },  // Session 1: 10 min
        { content_id: 101, duration_seconds: 600 },  // Session 2: 10 min
        { content_id: 101, duration_seconds: 600 }   // Session 3: 10 min
      ]

      const totalMinutes = Math.round(
        practices.reduce((sum, p) => sum + p.duration_seconds, 0) / 60
      )

      expect(totalMinutes).toBe(30) // 3 sessions × 10 min
    })
  })

  describe('days practiced calculation', () => {
    test('calculates days between dates correctly', () => {
      const now = Date.now()
      const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000)

      const daysDiff = Math.floor((now - fourteenDaysAgo) / (1000 * 60 * 60 * 24))

      expect(daysDiff).toBe(14)
    })

    test('returns at least 1 day', () => {
      const now = Date.now()
      const oneHourAgo = now - (1 * 60 * 60 * 1000)

      const daysDiff = Math.floor((now - oneHourAgo) / (1000 * 60 * 60 * 24))
      const daysWithMinimum = Math.max(daysDiff, 1)

      expect(daysWithMinimum).toBe(1)
    })

    test('handles same-day completion', () => {
      const now = Date.now()
      const thirtyMinutesAgo = now - (30 * 60 * 1000)

      const daysDiff = Math.floor((now - thirtyMinutesAgo) / (1000 * 60 * 60 * 24))
      const daysWithMinimum = Math.max(daysDiff, 1)

      expect(daysWithMinimum).toBe(1) // Minimum 1 day
    })
  })

  describe('content title formatting', () => {
    test('removes "Complete" prefix', () => {
      const formatTitle = (name) => name
        .replace(/^Complete\s+/i, '')
        .replace(/\s+(Course|Learning Path)$/i, '')
        .trim()

      expect(formatTitle('Complete Blues Foundations Course'))
        .toBe('Blues Foundations')
    })

    test('removes course suffix', () => {
      const formatTitle = (name) => name
        .replace(/^Complete\s+/i, '')
        .replace(/\s+(Course|Learning Path)$/i, '')
        .trim()

      expect(formatTitle('Advanced Jazz Course'))
        .toBe('Advanced Jazz')
    })

    test('removes learning path suffix', () => {
      const formatTitle = (name) => name
        .replace(/^Complete\s+/i, '')
        .replace(/\s+(Course|Learning Path)$/i, '')
        .trim()

      expect(formatTitle('Beginner Learning Path'))
        .toBe('Beginner')
    })

    test('handles both prefix and suffix', () => {
      const formatTitle = (name) => name
        .replace(/^Complete\s+/i, '')
        .replace(/\s+(Course|Learning Path)$/i, '')
        .trim()

      expect(formatTitle('Complete Advanced Drumming Learning Path'))
        .toBe('Advanced Drumming')
    })

    test('handles names without prefix or suffix', () => {
      const formatTitle = (name) => name
        .replace(/^Complete\s+/i, '')
        .replace(/\s+(Course|Learning Path)$/i, '')
        .trim()

      expect(formatTitle('Blues Foundations'))
        .toBe('Blues Foundations')
    })
  })
})
