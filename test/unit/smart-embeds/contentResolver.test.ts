import {
  resolveSmartEmbed,
  resolveSmartEmbeds,
  resolveSmartEmbedsFromUrls,
} from '../../../src/services/smart-embeds/contentResolver'
import { SmartEmbedUrl } from '../../../src/services/smart-embeds/types'

jest.mock('../../../src/services/sanity.js', () => ({
  fetchByRailContentIds: jest.fn(),
}))

const { fetchByRailContentIds } = require('../../../src/services/sanity.js')

describe('resolveSmartEmbed', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('resolves single embed correctly', async () => {
    const mockContent = {
      id: 123,
      sanity_id: 'sanity-123',
      title: 'Test Song',
      type: 'song',
      thumbnail: 'https://example.com/thumb.jpg',
      artist: { name: 'Test Artist' },
      difficulty_string: 'Intermediate',
      length_in_seconds: 300,
      brand: 'drumeo',
      slug: 'test-song',
      permission_id: 91,
      membership_tier: null,
      published_on: '2024-01-01',
      status: 'published',
    }

    fetchByRailContentIds.mockResolvedValue([mockContent])

    const parsedUrl: SmartEmbedUrl = {
      brand: 'drumeo',
      contentId: 123,
      originalUrl: 'https://www.musora.com/drumeo/songs/transcription/123',
    }

    const result = await resolveSmartEmbed(parsedUrl)

    expect(result).not.toBeNull()
    expect(result?.content.id).toBe(123)
    expect(result?.content.title).toBe('Test Song')
    expect(result?.content.artistName).toBe('Test Artist')
    expect(result?.content.type).toBe('song')
    expect(result?.originalUrl).toBe('https://www.musora.com/drumeo/songs/transcription/123')
  })

  test('returns null for non-existent content', async () => {
    fetchByRailContentIds.mockResolvedValue([])

    const parsedUrl: SmartEmbedUrl = {
      brand: 'drumeo',
      contentId: 999,
      originalUrl: 'https://www.musora.com/drumeo/songs/transcription/999',
    }

    const result = await resolveSmartEmbed(parsedUrl)
    expect(result).toBeNull()
  })

  test('filters out unpublished content', async () => {
    const mockContent = {
      id: 123,
      title: 'Draft Song',
      type: 'song',
      brand: 'drumeo',
      status: 'draft',
    }

    fetchByRailContentIds.mockResolvedValue([mockContent])

    const parsedUrl: SmartEmbedUrl = {
      brand: 'drumeo',
      contentId: 123,
      originalUrl: 'https://www.musora.com/drumeo/songs/transcription/123',
    }

    const result = await resolveSmartEmbed(parsedUrl)
    expect(result).toBeNull()
  })
})

describe('resolveSmartEmbeds', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('resolves multiple embeds', async () => {
    const mockContents = [
      {
        id: 123,
        title: 'Song 1',
        type: 'song',
        brand: 'drumeo',
        status: 'published',
      },
      {
        id: 456,
        title: 'Course Lesson',
        type: 'course-lesson',
        brand: 'drumeo',
        status: 'published',
      },
    ]

    fetchByRailContentIds.mockResolvedValue(mockContents)

    const parsedUrls: SmartEmbedUrl[] = [
      {
        brand: 'drumeo',
        contentId: 123,
        originalUrl: 'https://www.musora.com/drumeo/songs/transcription/123',
      },
      {
        brand: 'drumeo',
        contentId: 456,
        originalUrl: 'https://www.musora.com/drumeo/lessons/course/100/456',
      },
    ]

    const results = await resolveSmartEmbeds(parsedUrls)
    expect(results).toHaveLength(2)
    expect(results[0].content.id).toBe(123)
    expect(results[1].content.id).toBe(456)
  })

  test('returns empty array for empty input', async () => {
    const results = await resolveSmartEmbeds([])
    expect(results).toEqual([])
  })

  test('handles API errors gracefully', async () => {
    fetchByRailContentIds.mockRejectedValue(new Error('API Error'))

    const parsedUrls: SmartEmbedUrl[] = [
      {
        brand: 'drumeo',
        contentId: 123,
        originalUrl: 'https://www.musora.com/drumeo/songs/transcription/123',
      },
    ]

    const results = await resolveSmartEmbeds(parsedUrls)
    expect(results).toEqual([])
  })
})

describe('resolveSmartEmbedsFromUrls', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('parses and resolves URLs', async () => {
    const mockContent = {
      id: 123,
      title: 'Test Song',
      type: 'song',
      brand: 'drumeo',
      status: 'published',
    }

    fetchByRailContentIds.mockResolvedValue([mockContent])

    const { results, unsupported } = await resolveSmartEmbedsFromUrls([
      'https://www.musora.com/drumeo/songs/transcription/123',
    ])

    expect(results).toHaveLength(1)
    expect(unsupported).toHaveLength(0)
  })

  test('returns unsupported for non-resolvable URLs', async () => {
    fetchByRailContentIds.mockResolvedValue([])

    const { results, unsupported } = await resolveSmartEmbedsFromUrls([
      'https://www.musora.com/drumeo/songs/transcription/999',
    ])

    expect(results).toHaveLength(0)
    expect(unsupported).toHaveLength(1)
  })
})
