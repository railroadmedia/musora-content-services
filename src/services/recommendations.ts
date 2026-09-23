/**
 * @module Recommendations
 */

import { TabResponseType } from '../contentMetaData.js'
import { getFieldsForContentTypeWithFilteredChildren } from '../contentTypeConfig.js'
import { decorateAll, type FieldDecorator } from '../lib/sanity/decorators/base'
import { accessDecorator } from '../lib/sanity/decorators/need-access'
import { lifetimeUpgradeDecorator } from '../lib/sanity/decorators/need-lifetime-upgrade'
import { decorateNavigateTo } from '../lib/sanity/decorators/navigate-to'
import { pageTypeDecorator } from '../lib/sanity/decorators/page-type'
import { Filters as f } from '../lib/sanity/filter'
import { groq } from '../lib/sanity/groq'
import { fetchUserPermissions } from './permissions/index'
import { recommendations } from './recommender.js'
import { getSanityDate } from './sanity.js'

/**
 * @type {string[]}
 */
const excludeFromGeneratedIndex = ['getRecommendedForYou']

const RECOMMENDED_ROW_ID = 'recommended'
const RECOMMENDED_CONTENT_TYPE = 'tab-data'

interface RecommendedLesson {
  id: number
  type: string
  brand: string
  thumbnail: string
  published_on: string | null
  status: string
  live_event_start_time?: string | null
  live_event_end_time?: string | null
  children?: RecommendedLesson[]
  [key: string]: unknown
}

interface RecommendedRow {
  id: string
  title: string
  items: RecommendedLesson[]
}

interface RecommendedCatalog {
  type: string
  data: RecommendedLesson[]
  meta: Record<string, never>
}

export interface RecommendedForYouOptions {
  page?: number
  limit?: number
}

const isLiveDecorator: FieldDecorator<RecommendedLesson, 'isLive', boolean> = {
  field: 'isLive',
  recurse: false,
  compute: (lesson) => {
    const now = getSanityDate(new Date(), false)
    return Boolean(
      lesson.live_event_start_time &&
        lesson.live_event_end_time &&
        lesson.live_event_start_time <= now &&
        lesson.live_event_end_time >= now
    )
  },
}

const uniqueIds = (ids: Array<number | null | undefined>): number[] => [
  ...new Set(ids.filter((id) => id !== null && id !== undefined) as number[]),
]

const sortByRecommendedOrder = (lessons: RecommendedLesson[], ids: number[]): RecommendedLesson[] =>
  lessons.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))

async function fetchRecommendedLessons(ids: number[], brand: string): Promise<RecommendedLesson[]> {
  if (!ids.length) return []

  const [restrictions, lessonCountFilter, fields] = await Promise.all([
    f.combineAsync(
      f.idIn(ids),
      brand ? f.brand(brand) : f.empty,
      f.status(),
      f.notDeprecated(),
      f.permissions()
    ),
    f.combineAsync('_id in ^.child[]._ref', f.status(), f.notDeprecated(), f.permissions()),
    getFieldsForContentTypeWithFilteredChildren(RECOMMENDED_CONTENT_TYPE, false) as Promise<
      string[]
    >,
  ])

  const [result, permissions] = await Promise.all([
    groq()
      .and(restrictions)
      .select(
        ...fields,
        `"lesson_count": coalesce(${f.count(lessonCountFilter)}, 0)`,
        'live_event_start_time',
        'live_event_end_time'
      )
      .run<RecommendedLesson[]>(),
    fetchUserPermissions(),
  ])

  const decorated = await result
    .map((lessons) =>
      decorateAll<RecommendedLesson>(lessons ?? [], [
        accessDecorator(permissions) as FieldDecorator<RecommendedLesson>,
        lifetimeUpgradeDecorator(permissions) as FieldDecorator<RecommendedLesson>,
        pageTypeDecorator as FieldDecorator<RecommendedLesson>,
        isLiveDecorator as FieldDecorator<RecommendedLesson>,
      ])
    )
    .mapAsync((lessons) => decorateNavigateTo(lessons) as Promise<RecommendedLesson[]>)

  return sortByRecommendedOrder(decorated.recover([]), ids)
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
  const data = await recommendations(brand, { limit: page * limit })

  if (!data || !data.length) {
    return { id: RECOMMENDED_ROW_ID, title, items: [] }
  }

  const offset = (page - 1) * limit
  const contents = await fetchRecommendedLessons(
    uniqueIds(data.slice(offset, offset + limit)),
    brand
  )

  if (rowId) {
    return { type: TabResponseType.CATALOG, data: contents, meta: {} }
  }

  return { id: RECOMMENDED_ROW_ID, title, items: contents }
}
