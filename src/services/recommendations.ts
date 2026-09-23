/**
 * @module Recommendations
 */

import { TabResponseType } from '../contentMetaData.js'
import { getFieldsForContentTypeWithFilteredChildren } from '../contentTypeConfig.js'
import { decorateAll, type FieldDecorator } from '../lib/sanity/decorators/base'
import { accessDecorator, type WithNeedAccess } from '../lib/sanity/decorators/need-access'
import {
  lifetimeUpgradeDecorator,
  type WithNeedLifetimeUpgrade,
} from '../lib/sanity/decorators/need-lifetime-upgrade'
import { decorateNavigateTo, type WithNavigateTo } from '../lib/sanity/decorators/navigate-to'
import { pageTypeDecorator, type WithPageType } from '../lib/sanity/decorators/page-type'
import { Filters as f } from '../lib/sanity/filter'
import { groq } from '../lib/sanity/groq'
import { globalConfig } from './config.js'
import { GET, HttpClient } from '../infrastructure/http/HttpClient'
import { fetchUserPermissions } from './permissions/index'

/**
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

const RECOMMENDED_ROW_ID = 'recommended'
const RECOMMENDED_CONTENT_TYPE = 'tab-data'

const RECOMMENDER_URL = 'https://recommender.musora.com'
const recommenderClient = new HttpClient(RECOMMENDER_URL, null, null, null, 'omit')

interface RecommendedContent {
  id: number
  type: string
  brand: string
  thumbnail: string
  published_on: string | null
  status: string
  live_event_start_time?: string | null
  live_event_end_time?: string | null
  children?: RecommendedContent[]
  [key: string]: unknown
}

type DecoratedRecommendedContent = WithNeedLifetimeUpgrade<
  WithPageType<WithNeedAccess<RecommendedContent>>
> & { isLive: boolean }

type NavigableRecommendedContent = WithNavigateTo<DecoratedRecommendedContent>

interface RecommendedRow {
  id: string
  title: string
  items: NavigableRecommendedContent[]
}

interface RecommendedCatalog {
  type: string
  data: NavigableRecommendedContent[]
  meta: Record<string, never>
}

export interface RecommendedForYouOptions {
  page?: number
  limit?: number
}

export interface RecommendationsOptions {
  section?: string
  contentTypes?: string[]
}

export interface RankedCategory {
  slug: string
  items: number[]
}

export type CategoriesToRank = Record<string, number[]>

/**
 * @param {number|string} contentId
 * @param {string} brand
 * @param {number} [count=10]
 * @returns {Promise<number[]|null>}
 * @example
 * fetchSimilarItems(1113, 'drumeo')
 *   .then(ids => console.log(ids))
 *   .catch(error => console.error(error));
 */
export async function fetchSimilarItems(
  contentId: number | string,
  brand: string,
  count: number = 10
): Promise<number[] | null> {
  if (!contentId) {
    return []
  }
  const id = parseInt(String(contentId))
  const data = {
    brand,
    content_ids: id,
    num_similar: count + 1,
    page_size: count + 1,
    page: 1,
    exclude_interacted: true,
  }
  try {
    const response = await recommenderClient.post('/similar_items/', data)
    return response['similar_items'].filter((item: number) => item !== id).slice(0, count)
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

/**
 * @param {string} brand
 * @param {CategoriesToRank} categories
 * @returns {Promise<RankedCategory[]>}
 * @example
 * rankCategories('drumeo', { 1: [111222, 23120], 2: [2222, 33333] })
 *   .then(categories => console.log(categories))
 *   .catch(error => console.error(error));
 */
export async function rankCategories(
  brand: string,
  categories: CategoriesToRank
): Promise<RankedCategory[]> {
  const data = {
    brand,
    user_id: globalConfig.sessionConfig.userId,
    playlists: categories,
  }
  try {
    const response = await recommenderClient.post('/rank_each_list/', data)
    return response['ranked_playlists'].map((rankedPlaylist: any) => ({
      slug: rankedPlaylist.playlist_id,
      items: rankedPlaylist.ranked_items,
    }))
  } catch (error) {
    console.error('RankCategories fetch error:', error)
  }

  return Object.entries(categories).map(([slug, items]) => ({ slug, items }))
}

/**
 * @param {string} brand
 * @param {number[]} contentIds
 * @returns {Promise<number[]>}
 * @example
 * rankItems('drumeo', [111222, 23120, 402199])
 *   .then(ids => console.log(ids))
 *   .catch(error => console.error(error));
 */
export async function rankItems(brand: string, contentIds: number[]): Promise<number[]> {
  if (contentIds.length === 0) {
    return []
  }
  const data = {
    brand,
    user_id: globalConfig.sessionConfig.userId,
    content_ids: contentIds,
  }
  try {
    const response = await recommenderClient.post('/rank_items/', data)
    return response['ranked_content_ids']
  } catch (error) {
    console.error('rankItems fetch error:', error)
    return contentIds
  }
}

/**
 * @param {string} brand
 * @param {RecommendationsOptions} [options={}]
 * @returns {Promise<number[]>}
 * @example
 * recommendations('drumeo', { section: 'lessons', contentTypes: ['course'] })
 *   .then(ids => console.log(ids))
 *   .catch(error => console.error(error));
 */
export async function recommendations(
  brand: string,
  { section = '', contentTypes = [] }: RecommendationsOptions = {}
): Promise<number[]> {
  const sectionParam = section.toUpperCase().replace('-', '_')
  const sectionString = sectionParam ? `&section=${sectionParam}` : ''
  const contentTypesString = contentTypes
    .map((type) => `&content_types[]=${encodeURIComponent(type)}`)
    .join('')

  return await GET(
    `/api/content/v1/recommendations?brand=${brand}${sectionString}${contentTypesString}`
  )
}

const isLiveDecorator: FieldDecorator<RecommendedContent, 'isLive', boolean> = {
  field: 'isLive',
  recurse: false,
  compute: (content) => {
    const now = new Date().toISOString()
    return Boolean(
      content.live_event_start_time &&
        content.live_event_end_time &&
        content.live_event_start_time <= now &&
        content.live_event_end_time >= now
    )
  },
}

const uniqueIds = (ids: Array<number | null | undefined>): number[] => [
  ...new Set(ids.filter((id) => id !== null && id !== undefined) as number[]),
]

const sortByRecommendedOrder = (
  content: NavigableRecommendedContent[],
  ids: number[]
): NavigableRecommendedContent[] => content.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))

async function fetchRecommendedContent(
  ids: number[],
  brand: string
): Promise<NavigableRecommendedContent[]> {
  if (!ids.length) return []

  const [restrictions, lessonCountFilter, fields, permissions] = await Promise.all([
    f.combineAsync(
      f.idIn(ids),
      brand ? f.brand(brand) : f.empty,
      f.status(),
      f.notDeprecated(),
      f.permissions({ showMembershipRestrictedContent: true })
    ),
    f.combineAsync('_id in ^.child[]._ref', f.status(), f.notDeprecated(), f.permissions()),
    getFieldsForContentTypeWithFilteredChildren(RECOMMENDED_CONTENT_TYPE, false) as Promise<
      string[]
    >,
    fetchUserPermissions(),
  ])

  return groq()
    .and(restrictions)
    .select(
      ...fields,
      `"lesson_count": coalesce(${f.count(lessonCountFilter)}, 0)`,
      'live_event_start_time',
      'live_event_end_time'
    )
    .run<RecommendedContent[]>()
    .map(
      (contents) =>
        decorateAll<RecommendedContent>(contents ?? [], [
          accessDecorator(permissions),
          lifetimeUpgradeDecorator(permissions),
          pageTypeDecorator,
          isLiveDecorator,
        ]) as DecoratedRecommendedContent[]
    )
    .mapAsync((contents) => decorateNavigateTo(contents))
    .ltap((error) => console.error(error.message))
    .map((contents) => sortByRecommendedOrder(contents, ids))
    .recover([])
}

/**
 * @param {string} brand
 * @param {string|null} [rowId=null]
 * @param {Object} [params={}]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @returns {Promise<RecommendedRow|RecommendedCatalog>}
 * @example
 * getRecommendedForYou('drumeo')
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 * @example
 * getRecommendedForYou('drumeo', null, { page: 2, limit: 5 })
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 */
export async function getRecommendedForYou(
  brand: string,
  rowId: string | null = null,
  { page = 1, limit = 10 }: RecommendedForYouOptions = {}
): Promise<RecommendedRow | RecommendedCatalog> {
  const title = brand === 'playbass' ? 'You Might Like' : 'Recommended For You'
  const data = await recommendations(brand)

  if (!data || !data.length) {
    return { id: RECOMMENDED_ROW_ID, title, items: [] }
  }

  const offset = (page - 1) * limit
  const contents = await fetchRecommendedContent(
    uniqueIds(data.slice(offset, offset + limit)),
    brand
  )

  if (rowId) {
    return { type: TabResponseType.CATALOG, data: contents, meta: {} }
  }

  return { id: RECOMMENDED_ROW_ID, title, items: contents }
}
