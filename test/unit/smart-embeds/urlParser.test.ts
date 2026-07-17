import {
  isInternalUrl,
  sanitizeUrl,
  parseContentUrl,
  extractUrlsFromText,
  parseMultipleUrls,
} from '../../../src/services/smart-embeds/urlParser'

describe('isInternalUrl', () => {
  test('returns true for www.musora.com', () => {
    expect(isInternalUrl('https://www.musora.com/drumeo/songs/transcription/123')).toBe(true)
  })

  test('returns true for brand domains', () => {
    expect(isInternalUrl('https://www.drumeo.com/drumeo/lessons/course/123/456')).toBe(true)
    expect(isInternalUrl('https://www.pianote.com/pianote/songs/tutorial/789')).toBe(true)
    expect(isInternalUrl('https://www.guitareo.com/guitareo/method/lesson/100')).toBe(true)
    expect(isInternalUrl('https://www.singeo.com/singeo/lessons/workout/200')).toBe(true)
  })

  test('returns true for staging domains', () => {
    expect(isInternalUrl('https://staging.musora.com/drumeo/songs/transcription/123')).toBe(true)
    expect(isInternalUrl('https://beta.drumeo.com/drumeo/lessons/course/123/456')).toBe(true)
  })

  test('returns true for localhost', () => {
    expect(isInternalUrl('http://localhost:3000/drumeo/songs/transcription/123')).toBe(true)
  })

  test('returns false for external URLs', () => {
    expect(isInternalUrl('https://www.google.com/search?q=drumeo')).toBe(false)
    expect(isInternalUrl('https://www.youtube.com/watch?v=abc123')).toBe(false)
    expect(isInternalUrl('https://facebook.com/drumeo')).toBe(false)
  })

  test('returns false for invalid URLs', () => {
    expect(isInternalUrl('not a url')).toBe(false)
    expect(isInternalUrl('')).toBe(false)
  })
})

describe('sanitizeUrl', () => {
  test('removes UTM parameters', () => {
    const url = 'https://www.musora.com/drumeo/songs/transcription/123?utm_source=email&utm_medium=newsletter'
    expect(sanitizeUrl(url)).toBe('https://www.musora.com/drumeo/songs/transcription/123')
  })

  test('removes fbclid parameter', () => {
    const url = 'https://www.musora.com/drumeo/songs/transcription/123?fbclid=abc123'
    expect(sanitizeUrl(url)).toBe('https://www.musora.com/drumeo/songs/transcription/123')
  })

  test('removes hash fragments', () => {
    const url = 'https://www.musora.com/drumeo/songs/transcription/123#comment-456'
    expect(sanitizeUrl(url)).toBe('https://www.musora.com/drumeo/songs/transcription/123')
  })

  test('returns original URL for invalid input', () => {
    expect(sanitizeUrl('not a url')).toBe('not a url')
  })
})

describe('parseContentUrl - songs', () => {
  test('parses song (transcription) URL', () => {
    const result = parseContentUrl('https://www.musora.com/drumeo/songs/transcription/123')
    expect(result).toEqual({
      brand: 'drumeo',
      contentType: 'song',
      contentId: 123,
      originalUrl: 'https://www.musora.com/drumeo/songs/transcription/123',
    })
  })

  test('parses song-tutorial URL', () => {
    const result = parseContentUrl('https://www.musora.com/drumeo/songs/tutorial/456')
    expect(result).toEqual({
      brand: 'drumeo',
      contentType: 'song-tutorial',
      contentId: 456,
      originalUrl: 'https://www.musora.com/drumeo/songs/tutorial/456',
    })
  })

  test('parses song-tutorial-lesson URL with parent', () => {
    const result = parseContentUrl('https://www.musora.com/drumeo/songs/tutorial/456/789')
    expect(result).toEqual({
      brand: 'drumeo',
      contentType: 'song-tutorial-lesson',
      contentId: 789,
      parentId: 456,
      originalUrl: 'https://www.musora.com/drumeo/songs/tutorial/456/789',
    })
  })

  test('parses play-along URL', () => {
    const result = parseContentUrl('https://www.musora.com/drumeo/songs/play-along/101')
    expect(result).toEqual({
      brand: 'drumeo',
      contentType: 'play-along',
      contentId: 101,
      originalUrl: 'https://www.musora.com/drumeo/songs/play-along/101',
    })
  })

  test('parses jam-track URL', () => {
    const result = parseContentUrl('https://www.musora.com/guitareo/songs/jam-track/202')
    expect(result).toEqual({
      brand: 'guitareo',
      contentType: 'jam-track',
      contentId: 202,
      originalUrl: 'https://www.musora.com/guitareo/songs/jam-track/202',
    })
  })
})

describe('parseContentUrl - lessons', () => {
  test('parses course-lesson URL', () => {
    const result = parseContentUrl('https://www.musora.com/drumeo/lessons/course/100/200')
    expect(result).toEqual({
      brand: 'drumeo',
      contentType: 'course-lesson',
      contentId: 200,
      parentId: 100,
      originalUrl: 'https://www.musora.com/drumeo/lessons/course/100/200',
    })
  })

  test('parses course-collection URL', () => {
    const result = parseContentUrl('https://www.musora.com/drumeo/lessons/course-collection/overview/300')
    expect(result).toEqual({
      brand: 'drumeo',
      contentType: 'course-collection',
      contentId: 300,
      originalUrl: 'https://www.musora.com/drumeo/lessons/course-collection/overview/300',
    })
  })

  test('parses live URL', () => {
    const result = parseContentUrl('https://www.musora.com/drumeo/lessons/400/live')
    expect(result).toEqual({
      brand: 'drumeo',
      contentType: 'live',
      contentId: 400,
      originalUrl: 'https://www.musora.com/drumeo/lessons/400/live',
    })
  })

  test('parses skill-pack-lesson URL', () => {
    const result = parseContentUrl('https://www.musora.com/drumeo/lessons/skill-pack/500/600')
    expect(result).toEqual({
      brand: 'drumeo',
      contentType: 'skill-pack-lesson',
      contentId: 600,
      parentId: 500,
      originalUrl: 'https://www.musora.com/drumeo/lessons/skill-pack/500/600',
    })
  })

  test('parses workout URL', () => {
    const result = parseContentUrl('https://www.musora.com/drumeo/lessons/workout/700')
    expect(result).toEqual({
      brand: 'drumeo',
      contentType: 'workout',
      contentId: 700,
      originalUrl: 'https://www.musora.com/drumeo/lessons/workout/700',
    })
  })

  test('parses quick-tips URL', () => {
    const result = parseContentUrl('https://www.musora.com/pianote/lessons/quick-tips/800')
    expect(result).toEqual({
      brand: 'pianote',
      contentType: 'quick-tips',
      contentId: 800,
      originalUrl: 'https://www.musora.com/pianote/lessons/quick-tips/800',
    })
  })
})

describe('parseContentUrl - method', () => {
  test('parses learning-path-lesson URL', () => {
    const result = parseContentUrl('https://www.musora.com/drumeo/method/lesson/900/1000')
    expect(result).toEqual({
      brand: 'drumeo',
      contentType: 'learning-path-lesson-v2',
      contentId: 1000,
      parentId: 900,
      originalUrl: 'https://www.musora.com/drumeo/method/lesson/900/1000',
    })
  })

  test('parses learning-path URL without child', () => {
    const result = parseContentUrl('https://www.musora.com/drumeo/method/lesson/1100')
    expect(result).toEqual({
      brand: 'drumeo',
      contentType: 'learning-path-v2',
      contentId: 1100,
      originalUrl: 'https://www.musora.com/drumeo/method/lesson/1100',
    })
  })
})

describe('parseContentUrl - edge cases', () => {
  test('returns null for external URLs', () => {
    expect(parseContentUrl('https://www.google.com/search')).toBeNull()
  })

  test('returns null for invalid brand', () => {
    expect(parseContentUrl('https://www.musora.com/invalid/songs/transcription/123')).toBeNull()
  })

  test('returns null for non-content paths', () => {
    expect(parseContentUrl('https://www.musora.com/drumeo/forums/thread/123')).toBeNull()
    expect(parseContentUrl('https://www.musora.com/drumeo/settings')).toBeNull()
    expect(parseContentUrl('https://www.musora.com/drumeo')).toBeNull()
  })

  test('returns null for non-numeric IDs', () => {
    expect(parseContentUrl('https://www.musora.com/drumeo/songs/transcription/abc')).toBeNull()
  })

  test('strips tracking params from result', () => {
    const result = parseContentUrl(
      'https://www.musora.com/drumeo/songs/transcription/123?utm_source=email&fbclid=xyz'
    )
    expect(result?.originalUrl).toBe('https://www.musora.com/drumeo/songs/transcription/123')
  })
})

describe('extractUrlsFromText', () => {
  test('extracts URLs from text', () => {
    const text = 'Check out this lesson https://www.musora.com/drumeo/songs/transcription/123 and also https://www.musora.com/drumeo/lessons/course/100/200'
    const result = extractUrlsFromText(text)
    expect(result).toEqual([
      'https://www.musora.com/drumeo/songs/transcription/123',
      'https://www.musora.com/drumeo/lessons/course/100/200',
    ])
  })

  test('handles URLs at end of sentences', () => {
    const text = 'Check this out: https://www.musora.com/drumeo/songs/transcription/123.'
    const result = extractUrlsFromText(text)
    expect(result).toEqual(['https://www.musora.com/drumeo/songs/transcription/123'])
  })

  test('returns empty array for text without URLs', () => {
    expect(extractUrlsFromText('No URLs here')).toEqual([])
  })
})

describe('parseMultipleUrls', () => {
  test('parses multiple valid URLs', () => {
    const urls = [
      'https://www.musora.com/drumeo/songs/transcription/123',
      'https://www.musora.com/drumeo/lessons/course/100/200',
    ]
    const result = parseMultipleUrls(urls)
    expect(result.parsed).toHaveLength(2)
    expect(result.unsupported).toHaveLength(0)
  })

  test('separates unsupported internal URLs', () => {
    const urls = [
      'https://www.musora.com/drumeo/songs/transcription/123',
      'https://www.musora.com/drumeo/forums/thread/456',
    ]
    const result = parseMultipleUrls(urls)
    expect(result.parsed).toHaveLength(1)
    expect(result.unsupported).toEqual(['https://www.musora.com/drumeo/forums/thread/456'])
  })

  test('ignores external URLs', () => {
    const urls = [
      'https://www.musora.com/drumeo/songs/transcription/123',
      'https://www.google.com/search',
    ]
    const result = parseMultipleUrls(urls)
    expect(result.parsed).toHaveLength(1)
    expect(result.unsupported).toHaveLength(0)
  })
})
