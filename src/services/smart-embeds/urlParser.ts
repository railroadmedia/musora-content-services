import { SmartEmbedUrl } from './types'
import { INTERNAL_DOMAINS, TRACKING_PARAMS_TO_REMOVE, isValidBrand } from './domains'

const URL_SEGMENT_TO_CONTENT_TYPE: Record<string, string> = {
  transcription: 'song',
  tutorial: 'song-tutorial',
  'play-along': 'play-along',
  'jam-track': 'jam-track',
  course: 'course-lesson',
  'course-collection': 'course-collection',
  'skill-pack': 'skill-pack-lesson',
  documentary: 'documentary-lesson',
  lesson: 'learning-path-lesson-v2',
  workout: 'workout',
  'quick-tips': 'quick-tips',
  'question-and-answer': 'question-and-answer',
  'student-review': 'student-review',
  'student-focus': 'student-focus',
  'coach-stream': 'coach-stream',
  rudiment: 'rudiment',
  routine: 'routine',
  performance: 'performance',
  podcast: 'podcast',
  'boot-camp': 'boot-camp',
  'gear-guide': 'gear-guide',
  spotlight: 'spotlight',
  'study-the-greats': 'study-the-greats',
  'odd-times': 'odd-times',
  'guided-course': 'guided-course',
}

const PARENT_CONTENT_TYPES: Record<string, string> = {
  'course-lesson': 'course',
  'guided-course-lesson': 'guided-course',
  'skill-pack-lesson': 'skill-pack',
  'documentary-lesson': 'documentary',
  'learning-path-lesson-v2': 'learning-path-v2',
  'song-tutorial-lesson': 'song-tutorial',
}

export function isInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    return INTERNAL_DOMAINS.includes(hostname)
  } catch {
    return false
  }
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)

    for (const param of TRACKING_PARAMS_TO_REMOVE) {
      parsed.searchParams.delete(param)
    }

    parsed.hash = ''

    return parsed.toString()
  } catch {
    return url
  }
}

export function parseContentUrl(url: string): SmartEmbedUrl | null {
  if (!isInternalUrl(url)) {
    return null
  }

  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname

    const segments = pathname.split('/').filter(Boolean)

    if (segments.length < 2) {
      return null
    }

    const brand = segments[0].toLowerCase()
    if (!isValidBrand(brand)) {
      return null
    }

    const pageType = segments[1]

    if (pageType === 'songs') {
      return parseSongsUrl(segments, brand, url)
    }

    if (pageType === 'lessons') {
      return parseLessonsUrl(segments, brand, url)
    }

    if (pageType === 'method') {
      return parseMethodUrl(segments, brand, url)
    }

    return null
  } catch {
    return null
  }
}

function parseSongsUrl(segments: string[], brand: string, originalUrl: string): SmartEmbedUrl | null {
  if (segments.length < 4) {
    return null
  }

  const contentTypeSegment = segments[2]
  let contentType = URL_SEGMENT_TO_CONTENT_TYPE[contentTypeSegment]

  if (!contentType) {
    return null
  }

  if (segments.length === 4) {
    const contentId = parseInt(segments[3], 10)
    if (isNaN(contentId)) {
      return null
    }

    return {
      brand,
      contentType,
      contentId,
      originalUrl: sanitizeUrl(originalUrl),
    }
  }

  if (segments.length >= 5) {
    const parentId = parseInt(segments[3], 10)
    const contentId = parseInt(segments[4], 10)

    if (isNaN(parentId) || isNaN(contentId)) {
      return null
    }

    if (contentType === 'song-tutorial') {
      contentType = 'song-tutorial-lesson'
    }

    return {
      brand,
      contentType,
      contentId,
      parentId,
      originalUrl: sanitizeUrl(originalUrl),
    }
  }

  return null
}

function parseLessonsUrl(segments: string[], brand: string, originalUrl: string): SmartEmbedUrl | null {
  if (segments.length < 3) {
    return null
  }

  if (segments.length >= 4 && segments[3] === 'live') {
    const contentId = parseInt(segments[2], 10)
    if (isNaN(contentId)) {
      return null
    }

    return {
      brand,
      contentType: 'live',
      contentId,
      originalUrl: sanitizeUrl(originalUrl),
    }
  }

  if (segments[2] === 'course-collection' && segments[3] === 'overview' && segments.length >= 5) {
    const contentId = parseInt(segments[4], 10)
    if (isNaN(contentId)) {
      return null
    }

    return {
      brand,
      contentType: 'course-collection',
      contentId,
      originalUrl: sanitizeUrl(originalUrl),
    }
  }

  const contentTypeSegment = segments[2]
  let contentType = URL_SEGMENT_TO_CONTENT_TYPE[contentTypeSegment] || contentTypeSegment

  if (segments.length === 4) {
    const contentId = parseInt(segments[3], 10)
    if (isNaN(contentId)) {
      return null
    }

    return {
      brand,
      contentType,
      contentId,
      originalUrl: sanitizeUrl(originalUrl),
    }
  }

  if (segments.length >= 5) {
    const parentId = parseInt(segments[3], 10)
    const contentId = parseInt(segments[4], 10)

    if (isNaN(parentId) || isNaN(contentId)) {
      return null
    }

    if (contentType === 'course' && segments[2] === 'course') {
      contentType = 'course-lesson'
    }

    return {
      brand,
      contentType,
      contentId,
      parentId,
      originalUrl: sanitizeUrl(originalUrl),
    }
  }

  return null
}

function parseMethodUrl(segments: string[], brand: string, originalUrl: string): SmartEmbedUrl | null {
  if (segments.length === 2) {
    return null
  }

  if (segments.length < 4) {
    return null
  }

  const contentTypeSegment = segments[2]

  if (contentTypeSegment !== 'lesson') {
    return null
  }

  if (segments.length === 4) {
    const contentId = parseInt(segments[3], 10)
    if (isNaN(contentId)) {
      return null
    }

    return {
      brand,
      contentType: 'learning-path-v2',
      contentId,
      originalUrl: sanitizeUrl(originalUrl),
    }
  }

  if (segments.length >= 5) {
    const parentId = parseInt(segments[3], 10)
    const contentId = parseInt(segments[4], 10)

    if (isNaN(parentId) || isNaN(contentId)) {
      return null
    }

    return {
      brand,
      contentType: 'learning-path-lesson-v2',
      contentId,
      parentId,
      originalUrl: sanitizeUrl(originalUrl),
    }
  }

  return null
}

export function extractUrlsFromText(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
  const matches = text.match(urlPattern) || []

  return matches.map(url => url.replace(/[.,;:!?)]+$/, ''))
}

export function parseMultipleUrls(urls: string[]): {
  parsed: SmartEmbedUrl[]
  unsupported: string[]
} {
  const parsed: SmartEmbedUrl[] = []
  const unsupported: string[] = []

  for (const url of urls) {
    const result = parseContentUrl(url)
    if (result) {
      parsed.push(result)
    } else if (isInternalUrl(url)) {
      unsupported.push(url)
    }
  }

  return { parsed, unsupported }
}
