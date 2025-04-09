/**
 * @module Railcontent-Services
 */

import { globalConfig } from './config.js'
import { fetchJSONHandler } from '../lib/httpHelper.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

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

  let data = {
    brand: brand,
    content_ids: content_id,
    num_similar: count,
  }
  const url = `/similar_items/`
  try {
    const response = await fetchHandler(url, 'POST', data)
    return response['similar_items']
  } catch (error) {
    console.error('Fetch error:', error)
    return null
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
  let data = {
    brand: brand,
    user_id: globalConfig.sessionConfig.userId,
    playlists: categories,
  }
  const url = `/rank_each_list/`
  try {
    const response = await fetchHandler(url, 'POST', data)
    let rankedCategories = {}
    response['ranked_playlists'].forEach(
      (category) =>
        (rankedCategories[category['playlist_id']] = categories[category['playlist_id']])
    )
    return rankedCategories
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
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
  let data = {
    brand: brand,
    user_id: globalConfig.sessionConfig.userId,
    content_ids: content_ids,
  }
  const url = `/rank_items/`
  try {
    const response = await fetchHandler(url, 'POST', data)
    return response['ranked_content_ids']
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

export async function recommendations(brand, { section = ''} = {}) {
  section = section.toUpperCase().replace('-', '_')
  const sectionString = section ? `&section=${section}` : '';
  const url = `/api/content/v1/recommendations?brand=${brand}${sectionString}`
  try {
    return fetchJSONHandler(
      url,
      globalConfig.sessionConfig.token,
      globalConfig.baseUrl,
      'get'
    )
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

async function fetchHandler(url, method = 'get', body = null) {
  return fetchJSONHandler(
    url,
    globalConfig.sessionConfig.token,
    globalConfig.baseUrl,
    method,
    null,
    body
  )
}
