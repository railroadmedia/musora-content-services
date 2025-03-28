/**
 * @module Railcontent-Services
 */

import { globalConfig } from './config.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

/**
 * Fetches similar content to the provided content id
 *
 * @param {brand} brand - brand of the content to filter
 * @param {integer} content_id - The ID of the content to find similar items for
 * @param {integer} count - number of items to return
 * @returns {Promise<Object|null>} - Returns the content_ids sorted by rank (most significant first)
 * @example
 * rankItems('drumeo', 1113)
 *   .then(status => console.log(status))
 *   .catch(error => console.error(error));
 */
export async function similarItems(brand, content_id, count = 10) {
  if (!content_id) {
    return []
  }

  let data = {
    'brand': brand,
    'content_ids': content_id,
    'num_similar': count,
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
    'brand': brand,
    'user_id': globalConfig.railcontentConfig.userId,
    'playlists': categories,
  }
  const url = `/rank_each_list/`
  try {
    const response = await fetchHandler(url, 'POST', data)
    let rankedCategories = {}
    response['ranked_playlists'].forEach((category) => rankedCategories[category['playlist_id']] = categories[category['playlist_id']])
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
    'brand': brand,
    'user_id': globalConfig.railcontentConfig.userId,
    'content_ids': content_ids,
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

async function fetchHandler(url, method = 'get', body = null) {

  let headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.recommendationsConfig.token,
  }

  const options = {
    method,
    headers,
  }

  if (body) {
    options.body = JSON.stringify(body)
  }
  try {
    const response = await fetchAbsolute(url, options)
    if (response.ok) {
      return await response.json()
    } else {
      console.error(`Fetch error: ${method} ${url} ${response.status} ${response.statusText}`)
      console.log(response)
    }
  } catch (error) {
    console.error('Fetch error:', error)
  }
  return null
}


function fetchAbsolute(url, params) {
  if (globalConfig.recommendationsConfig.token) {
    params.headers['Authorization'] = `Bearer ${globalConfig.recommendationsConfig.token}`
  }
  if (globalConfig.recommendationsConfig.baseUrl) {
    if (url.startsWith('/')) {
      return fetch(globalConfig.recommendationsConfig.baseUrl + url, params)
    }
  }
  return fetch(url, params)
}
