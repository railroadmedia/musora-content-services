/**
 * @module Railcontent-Services
 */
import { contentStatusCompleted } from './contentProgress.js'

import { globalConfig } from './config.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = [
  'fetchHandler'
]

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
    return [];
  }
  let data = {
    "brand": brand,
    "user_id": globalConfig.railcontentConfig.userId,
    "content_ids": content_ids
  }
  const url = `/rank_items/`
  try {
    const response = await fetchHandler(url, 'POST', data)
    console.log('result rankItems', response)
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
    console.log('r', response);
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
      return fetch(globalConfig.recommendationsConfig.token + url, params)
    }
  }
  return fetch(url, params)
}
