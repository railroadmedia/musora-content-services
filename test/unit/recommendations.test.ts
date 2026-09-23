import { getRecommendedForYou } from '../../src/services/recommendations'
import { SanityClient } from '../../src/infrastructure/sanity/SanityClient'
import * as recommender from '../../src/services/recommender.js'
import * as navigateTo from '../../src/lib/sanity/decorators/navigate-to'
import { initializeTestService } from '../initializeTests'

describe('getRecommendedForYou', () => {
  let executeQuerySpy: jest.SpyInstance
  let recommendationsSpy: jest.SpyInstance

  const lesson = (id: number) => ({
    id,
    type: 'course',
    brand: 'drumeo',
    thumbnail: '',
    published_on: null,
    status: 'published',
  })

  beforeEach(async () => {
    await initializeTestService()
    executeQuerySpy = jest.spyOn(SanityClient.prototype, 'executeQuery').mockResolvedValue([])
    recommendationsSpy = jest.spyOn(recommender, 'recommendations').mockResolvedValue([])
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
    const result = await getRecommendedForYou('playbass')

    expect((result as any).title).toBe('You Might Like')
  })

  test('requests enough items to cover the requested page', async () => {
    await getRecommendedForYou('drumeo', null, { page: 3, limit: 5 })

    expect(recommendationsSpy).toHaveBeenCalledWith('drumeo', { limit: 15 })
  })

  test('queries only the ids on the requested page, in recommender order', async () => {
    recommendationsSpy.mockResolvedValue([1, 2, 3, 4, 5, 6])
    executeQuerySpy.mockResolvedValue([lesson(6), lesson(4), lesson(5)])

    const result = await getRecommendedForYou('drumeo', null, { page: 2, limit: 3 })

    expect(executeQuerySpy.mock.calls[0][0]).toContain('railcontent_id in [4,5,6]')
    expect((result as any).items.map((item: any) => item.id)).toEqual([4, 5, 6])
  })

  test('keeps scheduled content by not filtering on published_on', async () => {
    recommendationsSpy.mockResolvedValue([1])

    await getRecommendedForYou('drumeo')

    const query = executeQuerySpy.mock.calls[0][0] as string
    expect(query).toContain("status in ['scheduled','published']")
    expect(query).not.toContain('published_on <=')
  })

  test('decorates results', async () => {
    recommendationsSpy.mockResolvedValue([1])
    executeQuerySpy.mockResolvedValue([
      { ...lesson(1), live_event_start_time: null, live_event_end_time: null },
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
    recommendationsSpy.mockResolvedValue([1])
    executeQuerySpy.mockResolvedValue([lesson(1)])

    const result = await getRecommendedForYou('drumeo', 'some-row')

    expect(result).toMatchObject({ type: expect.any(String), meta: {} })
    expect((result as any).data).toHaveLength(1)
  })
})
