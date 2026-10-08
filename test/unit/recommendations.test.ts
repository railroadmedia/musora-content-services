jest.mock('../../src/infrastructure/http/HttpClient.ts', () => {
  const mockPost = jest.fn()
  const mockGet = jest.fn()
  const MockHttpClient = jest.fn().mockImplementation(() => ({ post: mockPost }))
  ;(MockHttpClient as any)._mockPost = mockPost
  return { HttpClient: MockHttpClient, GET: mockGet }
})

import {
  fetchSimilarItems,
  getRecommendedForYou,
  rankCategories,
  rankItems,
  recommendations,
} from '../../src/services/recommendations'
import { SanityClient } from '../../src/infrastructure/sanity/SanityClient'
import * as navigateTo from '../../src/lib/sanity/decorators/navigate-to'
import { initializeTestService } from '../initializeTests'

const httpClientModule = require('../../src/infrastructure/http/HttpClient.ts')
const mockPost = () => httpClientModule.HttpClient._mockPost
const mockGet = () => httpClientModule.GET

describe('fetchSimilarItems', () => {
  beforeEach(() => {
    mockPost().mockReset()
  })

  test('returns empty array when contentId is falsy', async () => {
    expect(await fetchSimilarItems(null as any, 'drumeo')).toEqual([])
    expect(await fetchSimilarItems(0, 'drumeo')).toEqual([])
    expect(await fetchSimilarItems('', 'drumeo')).toEqual([])
  })

  test('parses string contentId to integer for filtering', async () => {
    mockPost().mockResolvedValue({ similar_items: [42, 99] })

    const result = await fetchSimilarItems('42', 'drumeo', 10)

    expect(result).not.toContain(42)
    expect(result).toEqual([99])
  })

  test('filters out the requested contentId from results', async () => {
    mockPost().mockResolvedValue({ similar_items: [1, 2, 3] })

    expect(await fetchSimilarItems(2, 'drumeo', 10)).toEqual([1, 3])
  })

  test('respects count limit', async () => {
    mockPost().mockResolvedValue({ similar_items: [10, 20, 30, 40, 50, 60] })

    expect(await fetchSimilarItems(99, 'drumeo', 3)).toHaveLength(3)
  })

  test('returns null on error', async () => {
    mockPost().mockRejectedValue(new Error('network failure'))

    expect(await fetchSimilarItems(1, 'drumeo')).toBeNull()
  })
})

describe('rankItems', () => {
  beforeEach(() => {
    mockPost().mockReset()
  })

  test('returns an empty array without calling the recommender', async () => {
    expect(await rankItems('drumeo', [])).toEqual([])
    expect(mockPost()).not.toHaveBeenCalled()
  })

  test('returns the ranked ids', async () => {
    mockPost().mockResolvedValue({ ranked_content_ids: [3, 1, 2] })

    expect(await rankItems('drumeo', [1, 2, 3])).toEqual([3, 1, 2])
  })

  test('falls back to the given ids on error', async () => {
    mockPost().mockRejectedValue(new Error('network failure'))

    expect(await rankItems('drumeo', [1, 2, 3])).toEqual([1, 2, 3])
  })
})

describe('rankCategories', () => {
  beforeEach(() => {
    mockPost().mockReset()
  })

  test('maps ranked playlists to slug and items', async () => {
    mockPost().mockResolvedValue({
      ranked_playlists: [
        { playlist_id: 'rock', ranked_items: [2, 1] },
        { playlist_id: 'jazz', ranked_items: [4, 3] },
      ],
    })

    expect(await rankCategories('drumeo', { rock: [1, 2], jazz: [3, 4] })).toEqual([
      { slug: 'rock', items: [2, 1] },
      { slug: 'jazz', items: [4, 3] },
    ])
  })

  test('falls back to the given order on error', async () => {
    mockPost().mockRejectedValue(new Error('network failure'))

    expect(await rankCategories('drumeo', { rock: [1, 2] })).toEqual([
      { slug: 'rock', items: [1, 2] },
    ])
  })
})

describe('recommendations', () => {
  beforeEach(() => {
    mockGet().mockReset()
    mockGet().mockResolvedValue([])
  })

  test('requests the brand only when no options are given', async () => {
    await recommendations('drumeo')

    expect(mockGet()).toHaveBeenCalledWith('/api/content/v1/recommendations?brand=drumeo')
  })

  test('upper-snake-cases the section and appends content types', async () => {
    await recommendations('drumeo', { section: 'quick-tips', contentTypes: ['course', 'song'] })

    expect(mockGet()).toHaveBeenCalledWith(
      '/api/content/v1/recommendations?brand=drumeo&section=QUICK_TIPS&content_types[]=course&content_types[]=song'
    )
  })
})

describe('getRecommendedForYou', () => {
  let executeQuerySpy: jest.SpyInstance

  const content = (id: number) => ({
    id,
    type: 'course',
    brand: 'drumeo',
    thumbnail: '',
    published_on: null,
    status: 'published',
  })

  beforeEach(async () => {
    await initializeTestService()
    mockGet().mockReset()
    mockGet().mockResolvedValue([])
    executeQuerySpy = jest.spyOn(SanityClient.prototype, 'executeQuery').mockResolvedValue([])
    jest.spyOn(navigateTo, 'decorateNavigateTo').mockImplementation(async (items: any) => items)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('returns an empty row when the recommender has nothing', async () => {
    const result = await getRecommendedForYou('drumeo')

    expect(result).toEqual({ id: 'recommended', title: 'Recommended For You', items: [] })
    expect(executeQuerySpy).not.toHaveBeenCalled()
  })

  test('uses the playbass title', async () => {
    expect((await getRecommendedForYou('playbass')) as any).toMatchObject({
      title: 'You Might Like',
    })
  })

  test('queries only the ids on the requested page, in recommender order', async () => {
    mockGet().mockResolvedValue([1, 2, 3, 4, 5, 6])
    executeQuerySpy.mockResolvedValue([content(6), content(4), content(5)])

    const result = await getRecommendedForYou('drumeo', null, { page: 2, limit: 3 })

    expect(executeQuerySpy.mock.calls[0][0]).toContain('railcontent_id in [4,5,6]')
    expect((result as any).items.map((item: any) => item.id)).toEqual([4, 5, 6])
  })

  test('keeps scheduled content by not filtering on published_on', async () => {
    mockGet().mockResolvedValue([1])

    await getRecommendedForYou('drumeo')

    const query = executeQuerySpy.mock.calls[0][0] as string
    expect(query).toContain("status in ['scheduled','published']")
    expect(query).not.toContain('published_on <=')
  })

  test('includes membership restricted content the user cannot access', async () => {
    mockGet().mockResolvedValue([1])

    await getRecommendedForYou('drumeo')

    const restrictions = (executeQuerySpy.mock.calls[0][0] as string).split(']{')[0]
    expect(restrictions).toContain("membership_tier in ['plus','basic']")
  })

  test('marks restricted content as needing access', async () => {
    mockGet().mockResolvedValue([1])
    executeQuerySpy.mockResolvedValue([{ ...content(1), permission_id: [999999] }])

    const result = await getRecommendedForYou('drumeo')

    expect((result as any).items[0].need_access).toBe(true)
  })

  test('decorates results', async () => {
    mockGet().mockResolvedValue([1])
    executeQuerySpy.mockResolvedValue([
      { ...content(1), live_event_start_time: null, live_event_end_time: null },
    ])

    const result = await getRecommendedForYou('drumeo')

    expect((result as any).items[0]).toMatchObject({
      need_access: expect.any(Boolean),
      need_lifetime_upgrade: expect.any(Boolean),
      page_type: 'lesson',
      isLive: false,
    })
  })

  test('returns the catalog shape when a rowId is given', async () => {
    mockGet().mockResolvedValue([1])
    executeQuerySpy.mockResolvedValue([content(1)])

    const result = await getRecommendedForYou('drumeo', 'some-row')

    expect(result).toMatchObject({ type: expect.any(String), meta: {} })
    expect((result as any).data).toHaveLength(1)
  })
})
