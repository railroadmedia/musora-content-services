/**
 * @module Railcontent-Services
 */

import { globalConfig } from './config.js'
import { HttpClient } from '../infrastructure/http/HttpClient'
import { Either } from '../core/types/ads/either'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

const handleError = (message, error) => {
  console.error(message, error)
  return error
}

const baseURL = 'https://recommender.musora.com'

/**
 * Fetches similar content to the provided content id
 *
 * @param {integer} content_id - The ID of the content to find similar items for
 * @param {brand} brand - brand of the content to filter
 * @param {integer} count - number of items to return
 * @returns {Promise<Either<HttpError, Array<number>>} - Returns the content_ids sorted by rank (most significant first)
 * @example
 * rankItems('drumeo', 1113)
 *   .then(status => console.log(status))
 *   .catch(error => console.error(error));
 */
export async function fetchSimilarItems(content_id, brand, count = 10) {
  if (!content_id) {
    return []
  }
  content_id = parseInt(content_id)
  let data = {
    brand: brand,
    content_ids: content_id,
    num_similar: count + 1, // because the content itself is sometimes returned
  }
  return new HttpClient(baseURL)
    .post('/similar_items/', data)
    .then((res) =>
      res
        .ltap((err) => handleError('Fetch error:', err))
        .map((data) => data['similar_items'].filter((item) => item !== content_id).slice(0, count))
    )
}

const getDefaultSorting = (categories) => {
  const defaultSorting = []
  for (const slug in categories) {
    defaultSorting.push({
      slug: slug,
      items: categories[slug],
    })
  }
  return defaultSorting
}

const parseCategories = (data) => {
  let rankedCategories = []

  for (const rankedPlaylist of data['ranked_playlists']) {
    rankedCategories.push({
      slug: rankedPlaylist.playlist_id,
      items: rankedPlaylist.ranked_items,
    })
  }
  return rankedCategories
}

/**
 * Sorts the provided categories based on the user's match
 *
 * @param {brand} brand - brand of the content to filter
 * @param {Object} categories - Keyed arrays of content ids
 * @returns {Promise<Array<number>>} - Returns the content_ids sorted by rank (most significant first), elements in each category are also ranked
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
  return new HttpClient(baseURL).post('/rank_each_list/', data).then((res) =>
    res.fold(
      (err) => {
        console.error('RankCategories fetch error:', err)
        return getDefaultSorting(categories)
      },
      (data) => parseCategories(data)
    )
  )
}

/**
 * Fetches the completion status of a specific lesson for the current user.
 *
 * @param {brand} brand - brand of the content to filter
 * @param {Array<string>} content_ids - The IDs of the content to rank
 * @returns {Promise<Array<number>>} - Returns the content_ids sorted by rank (most significant first)
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
  return new HttpClient(baseURL).post('/rank_items/', data).then((res) =>
    res.fold(
      (err) => {
        console.error('rankItems fetch error:', err)
        return content_ids
      },
      (data) => data['ranked_items']
    )
  )
}

/**
 * Fetches recommended content for a specific brand and section.
 * If no section is provided, it fetches general recommendations for the brand.
 * The section parameter is optional and can be used to filter recommendations by a specific section.
 * The section value is converted to uppercase and any hyphens are replaced with underscores before being sent to the API.
 * @param {string} brand - The brand for which to fetch recommendations.
 * @param {Object} options - Optional parameters.
 * @param {string} options.section - The section to filter recommendations by (optional).
 * @returns {Promise<Array<Object>>} - Returns the recommended content or null in case of an error.
 */
export async function recommendations(brand, { section = '' } = {}) {
  section = section.toUpperCase().replace('-', '_')
  const sectionString = section ? `&section=${section}` : ''
  const url = `/api/content/v1/recommendations?brand=${brand}${sectionString}`
  return HttpClient.client()
    .get(url)
    .then((data) =>
      data.fold(
        (err) => {
          console.error('Recommendations fetch error:', err)
          return []
        },
        (data) => data
      )
    )
}
