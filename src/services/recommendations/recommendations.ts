/**
 * @module Railcontent-Services
 */

import { globalConfig } from '../config.js'
import { HttpClient } from '../../infrastructure/http/HttpClient'

/**
 * Exported functions that are excluded from index generation.
 */
const excludeFromGeneratedIndex: string[] = []
// If you're testing something locally and it's on DEV skip the proxy and target it directly
// const baseURL = 'https://MusoraProductDepartment-PWGeneratorDEV.hf.space'
const baseURL = 'https://recommender.musora.com'

interface SimilarItemsResponse {
  similar_items: number[]
}

interface RecommendedCategoriesResponse {
  ranked_topics: RecommendedCategory[]
}

interface RecommendedCategory {
  topic_id: string,
  title: string,
  score: number,
  ranked_items: number[],
}

interface RankedList {
  playlist_id: string
  ranked_items: number[]
}

interface ContentRow {
  slug: string,
  name: string
  ids: number[]
}

interface RankCategoriesResponse {
  ranked_playlists: RankedList[]
}

interface RankedCategory {
  slug: string
  items: number[]
}

interface RankItemsResponse {
  ranked_content_ids: number[]
}

interface Categories {
  [key: string]: number[]
}

interface RecommendationsOptions {
  section?: string
}

/**
 * Fetches similar content to the provided content id
 *
 * @returns Returns the content_ids sorted by rank (most significant first)
 * @example
 * fetchSimilarItems(1113, 'drumeo')
 *   .then(status => console.log(status))
 *   .catch(error => console.error(error));
 * @param content_id
 * @param brand
 * @param count
 */
export async function fetchSimilarItems(
  content_id: number | string,
  brand: string,
  count: number = 10
): Promise<number[] | null> {
  if (!content_id) {
    return []
  }

  const parsedContentId = typeof content_id === 'string' ? parseInt(content_id) : content_id

  const data = {
    brand: brand,
    content_ids: parsedContentId,
    num_similar: count + 1, // because the content itself is sometimes returned
  }

  const url = `/similar_items/`

  try {
    const httpClient = new HttpClient(baseURL)
    const response = await httpClient.post<SimilarItemsResponse>(url, data)
    // we requested count + 1 then filtered out the extra potential value, so we need slice to the correct size if necessary
    return response.similar_items
      .filter((item) => item !== parsedContentId)
      .slice(0, count)
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

/**
 * Fetches recommended content from the PWRecsys
 *
 * @returns Returns the content_ids sorted by rank (most significant first)
 * @example
 * fetchSimilarItems('drumeo', 'song')
 *   .then(status => console.log(status))
 *   .catch(error => console.error(error));
 * @param brand
 * @param pageName
 * @param count
 */
export async function fetchRecommendedCategories(
  brand: string,
  pageName: string,
  count: number = 10
): Promise<ContentRow[] | []> {
  pageName = pageName.toLowerCase()
  pageName = pageName.endsWith('s') ? pageName.slice(0, -1) : pageName;
  if (pageName !== 'song' && pageName !== 'lesson') {
    console.error("Invalid content type for", pageName)
    return []
  }

  const data = {
    brand: brand,
    user_id: globalConfig.sessionConfig.userId,
    content_type: pageName,
    count: count,
  }
  const url = `/recommend_topics/`

  try {
    // TODO Remove before production deployment
    //const httpClient = new HttpClient(tempBaseURL)
    const httpClient = new HttpClient('https://MusoraProductDepartment-PWGeneratorDEV.hf.space')
    const response = await httpClient.post<RecommendedCategoriesResponse>(url, data)
    return response.ranked_topics
      .slice(0, count) // topics come pre-ranked
      .map(r => {
        return {
          slug: r.topic_id,
          name: r.title,
          ids: r.ranked_items,
        }
      });
  } catch (error) {
    console.error('Fetch error:', error)
    return []
  }
}

/**
 * Sorts the provided categories based on the user's match
 *
 * @param brand - brand of the content to filter
 * @param categories - Keyed arrays of content ids
 * @returns Returns the content_ids sorted by rank (most significant first), elements in each category are also ranked
 * @example
 * rankCategories('drumeo', {
 *   '1': [111222, 23120, 402199],
 *   '2': [2222, 33333, 44444]
 * })
 *   .then(status => console.log(status))
 *   .catch(error => console.error(error));
 */
export async function rankCategories(
  brand: string,
  categories: Categories
): Promise<RankedCategory[]> {
  if (Object.keys(categories).length === 0) {
    return []
  }

  const data = {
    brand: brand,
    user_id: globalConfig.sessionConfig.userId,
    playlists: categories,
  }

  const url = `/rank_each_list/`

  try {
    const httpClient = new HttpClient(baseURL)
    const response = await httpClient.post<RankCategoriesResponse>(url, data)
    const rankedCategories: RankedCategory[] = []

    for (const rankedPlaylist of response.ranked_playlists) {
      rankedCategories.push({
        slug: rankedPlaylist.playlist_id,
        items: rankedPlaylist.ranked_items,
      })
    }

    return rankedCategories
  } catch (error) {
    console.error('RankCategories fetch error:', error)
    const defaultSorting: RankedCategory[] = []

    for (const slug in categories) {
      defaultSorting.push({
        slug: slug,
        items: categories[slug],
      })
    }

    return defaultSorting
  }
}

/**
 * Ranks the provided content items based on the user's preferences
 *
 * @param brand - brand of the content to filter
 * @param content_ids - The IDs of the content to rank
 * @returns Returns the content_ids sorted by rank (most significant first)
 * @example
 * rankItems('drumeo', [111222, 23120, 402199])
 *   .then(status => console.log(status))
 *   .catch(error => console.error(error));
 */
export async function rankItems(
  brand: string,
  content_ids: number[]
): Promise<number[]> {
  if (content_ids.length === 0) {
    return []
  }

  const data = {
    brand: brand,
    user_id: globalConfig.sessionConfig.userId,
    content_ids: content_ids,
  }

  const url = `/rank_items/`

  try {
    const httpClient = new HttpClient(baseURL)
    const response = await httpClient.post<RankItemsResponse>(url, data)
    return response.ranked_content_ids
  } catch (error) {
    console.error('rankItems fetch error:', error)
    return content_ids
  }
}

/**
 * Fetches recommendations for a given brand and optional section
 *
 * @param brand - brand of the content to filter
 * @param options - Optional parameters including section
 * @returns Returns recommendations data
 * @example
 * recommendations('drumeo', { section: 'learning-path' })
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */
export async function recommendations(
  brand: string,
  { section = '' }: RecommendationsOptions = {}
): Promise<any> {
  const normalizedSection = section.toUpperCase().replace('-', '_')
  const sectionString = normalizedSection ? `&section=${normalizedSection}` : ''
  const url = `/api/content/v1/recommendations?brand=${brand}${sectionString}`

  try {
    const httpClient = new HttpClient(
      globalConfig.baseUrl,
      globalConfig.sessionConfig.token
    )
    return httpClient.get(url)
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

export { excludeFromGeneratedIndex }
