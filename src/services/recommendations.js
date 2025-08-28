/**
 * @module Railcontent-Services
 */

import { globalConfig } from './config.js'
import { HttpClient } from '../infrastructure/http/HttpClient'

const handleError = (message, error) => {
  console.error(message, error)
  return error
}

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
  content_id = parseInt(content_id)
  let data = {
    brand: brand,
    content_ids: content_id,
    num_similar: count + 1, // because the content itself is sometimes returned
  }
  const url = `/similar_items/`
  const httpClient = new HttpClient(
    globalConfig.recommendationsConfig.baseUrl,
    globalConfig.recommendationsConfig.token
  )
  return httpClient.post(url, data).then((r) =>
    r.fold(
      (error) => handleError('Fetch similar items error:', error),
      // we requested count + 1 then filtered out the extra potential value, so we need slice to the correct size if necessary
      (data) => data['similar_items'].filter((item) => item !== content_id).slice(0, count)
    )
  )
}

const parseRankedCategories = (data) => {
  let rankedCategories = []

  for (const rankedPlaylist of data) {
    rankedCategories.push({
      slug: rankedPlaylist.playlist_id,
      items: rankedPlaylist.ranked_items,
    })
  }
  return rankedCategories
}

const defaultSorting = (categories) => {
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
  const httpClient = new HttpClient(
    globalConfig.recommendationsConfig.baseUrl,
    globalConfig.recommendationsConfig.token
  )
  return httpClient.post(url, data).then((r) =>
    r.fold(
      (_error) => defaultSorting(categories),
      (data) => parseRankedCategories(data['ranked_playlists'])
    )
  )
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
  const httpClient = new HttpClient(
    globalConfig.recommendationsConfig.baseUrl,
    globalConfig.recommendationsConfig.token
  )
  return httpClient.post(url, data).then((r) =>
    r
      .ltap((_e) => handleError('Rank items fetch error:', error))
      .fold(
        (_error) => content_ids,
        (data) => data['ranked_content_ids']
      )
  )
}

export async function recommendations(brand, { section = '' } = {}) {
  section = section.toUpperCase().replace('-', '_')
  const sectionString = section ? `&section=${section}` : ''
  const url = `/api/content/v1/recommendations?brand=${brand}${sectionString}`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.get(url).then((r) =>
    r.fold(
      (error) => handleError('Recommendations fetch error:', error),
      (data) => data
    )
  )
}
