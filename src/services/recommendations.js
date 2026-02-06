/**
 * @module Railcontent-Services
 */

import { globalConfig } from './config.js'
import { GET, HttpClient } from '../infrastructure/http/HttpClient.ts'
import { fetchByRailContentIds } from './sanity.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

const RECOMMENDER_URL = 'https://recommender.musora.com'
const recommenderClient = new HttpClient(RECOMMENDER_URL)

/**
 * Fetches similar content to the provided content id
 *
 * @param {integer} content_id - The ID of the content to find similar items for
 * @param {brand} brand - brand of the content to filter
 * @param {integer} count - number of items to return
 * @returns {Promise<Object|null>} - Returns the content_ids sorted by rank (most significant first)
 * @example
 * rankItems('drumeo', 1113)
 *   .then(status => console.log(status))
 *   .catch(error => console.error(error));
 */
export async function fetchSimilarItems(content_id, brand, count = 10) {
  if (!content_id) {
    return []
  }
  if (brand === 'playbass') {
    // V2 launch customization for playbass
    const content = (await fetchByRailContentIds([content_id], 'tab-data'))[0] ?? []
    if (!content) {
      return []
    }
    const section = content.page_type === 'song' ? 'song' : ''
    const recs = await recommendations('playbass', {section: section})
    return recs.slice(0, count)
  } else {
    content_id = parseInt(content_id)
    const data = {
      brand: brand,
      content_ids: content_id,
      num_similar: count + 1,
    }
    const url = `/similar_items/`
    try {
      const response = await recommenderClient.post(url, data)
      return response['similar_items'].filter((item) => item !== content_id).slice(0, count)
    } catch (error) {
      console.error('Fetch error:', error)
      return null
    }
  }

}

/**
 * Sorts the provided categories based on the user's match
 *
 * @param {brand} brand - brand of the content to filter
 * @param {Object} categories - Keyed arrays of content ids
 * @returns {Promise<Object|null>} - Returns the content_ids sorted by rank (most significant first), elements in each category are also ranked
 * @example
 * rankCategories('drumeo', {
 *                            1: [111222, 23120, 402199],
 *                            2: [2222, 33333, 44444]
 *                          }
 *                )
 *   .then(status => console.log(status))
 *   .catch(error => console.error(error));
 */
export async function rankCategories(brand, categories) {
  if (categories.length === 0) {
    return []
  }
  if (brand !== 'playbass') {
    const data = {
      brand: brand,
      user_id: globalConfig.sessionConfig.userId,
      playlists: categories,
    }
    const url = `/rank_each_list/`
    try {
      const response = await recommenderClient.post(url, data)
      const rankedCategories = []

      for (const rankedPlaylist of response['ranked_playlists']) {
        rankedCategories.push({
          slug: rankedPlaylist.playlist_id,
          items: rankedPlaylist.ranked_items,
        })
      }
      return rankedCategories
    } catch (error) {
      console.error('RankCategories fetch error:', error)
    }
  }

  const defaultSorting = []
  for (const slug in categories) {
    defaultSorting.push({
      slug: slug,
      items: categories[slug],
    })
  }
  return defaultSorting
}

/**
 * Fetches the completion status of a specific lesson for the current user.
 *
 * @param {brand} brand - brand of the content to filter
 * @param {Array<string>} content_ids - The IDs of the content to rank
 * @returns {Promise<Object|null>} - Returns the content_ids sorted by rank (most significant first)
 * @example
 * rankItems('drumeo', ([111222, 23120, 402199])
 *   .then(status => console.log(status))
 *   .catch(error => console.error(error));
 */
export async function rankItems(brand, content_ids) {
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
    const response = await recommenderClient.post(url, data)
    return response['ranked_content_ids']
  } catch (error) {
    console.error('rankItems fetch error:', error)
    return content_ids
  }
}

export async function recommendations(brand, { section = '', contentTypes = [] } = {}) {
  section = section.toUpperCase().replace('-', '_')
  const sectionString = section ? `&section=${section}` : ''
  const contentTypesString = contentTypes.length > 0
    ? contentTypes.map(type => `&content_types[]=${encodeURIComponent(type)}`).join('')
    : ''
  const url = `/api/content/v1/recommendations?brand=${brand}${sectionString}${contentTypesString}`
  return await GET(url)
}
