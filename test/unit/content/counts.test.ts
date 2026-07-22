import { fetchSongAndLessonCounts } from '../../../src/services/content/counts'
import { SanityClient } from '../../../src/infrastructure/sanity/SanityClient'

describe('fetchSongAndLessonCounts', () => {
  let executeQuerySpy: jest.SpyInstance

  beforeEach(() => {
    executeQuerySpy = jest.spyOn(SanityClient.prototype, 'executeQuery')
  })

  afterEach(() => {
    executeQuerySpy.mockRestore()
  })

  test('sums songs and lessons into total', async () => {
    executeQuerySpy.mockResolvedValue({ songs: 14297, lessons: 12826 })

    const result = await fetchSongAndLessonCounts()

    expect(result).toEqual({ songs: 14297, lessons: 12826, total: 27123 })
  })

  test('defaults to zero counts when the query returns nothing', async () => {
    executeQuerySpy.mockResolvedValue(null)

    const result = await fetchSongAndLessonCounts()

    expect(result).toEqual({ songs: 0, lessons: 0, total: 0 })
  })

  test('queries globally when no brand is provided', async () => {
    executeQuerySpy.mockResolvedValue({ songs: 1, lessons: 1 })

    await fetchSongAndLessonCounts()

    const query = executeQuerySpy.mock.calls[0][0] as string
    expect(query).not.toContain('brand ==')
  })

  test('scopes both counts to the given brand', async () => {
    executeQuerySpy.mockResolvedValue({ songs: 1, lessons: 1 })

    await fetchSongAndLessonCounts('drumeo')

    const query = executeQuerySpy.mock.calls[0][0] as string
    const brandFilterCount = query.split('brand == "drumeo"').length - 1
    expect(brandFilterCount).toBe(2)
  })

  test('scopes the songs filter to the known song types', async () => {
    executeQuerySpy.mockResolvedValue({ songs: 1, lessons: 1 })

    await fetchSongAndLessonCounts()

    const query = executeQuerySpy.mock.calls[0][0] as string
    expect(query).toContain("_type in ['song','play-along','jam-track','song-tutorial-lesson']")
  })

  test('scopes the lessons filter to top-level published content with a railcontent_id', async () => {
    executeQuerySpy.mockResolvedValue({ songs: 1, lessons: 1 })

    await fetchSongAndLessonCounts()

    const query = executeQuerySpy.mock.calls[0][0] as string
    expect(query).toContain('defined(railcontent_id)')
    expect(query).toContain("status in ['published']")
    expect(query).toContain('(!defined(parent_type) || count(parent_content_reference) == 0)')
  })
})
