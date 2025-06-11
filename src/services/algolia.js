/**
 * @module Search-Engine-Services
 */

import { globalConfig } from './config.js'
import { algoliasearch } from 'algoliasearch'

/**
 * Sends an event through the search engine API (as of now, algolia)
 *
 * @param {string} index - The index to which the event will be sent.
 * @param {string} queryId - The unique identifier for the search query.
 * @param {string[]} objectIDs - An array of object IDs that were clicked.
 * @param {number[]} positions - An array of positions corresponding to the object IDs clicked.
 *
 * @returns {Promise<void>} - A promise that resolves when the event is sent.
 *
 * @example
 * ```
 * sendAlgoliaClickEvent(
 *   'production_sanity_all',
 *   '43b15df305339e827f0ac0bdc5ebcaa7',
 *   ['9780545139700', '9780439784542'],
 *   [7, 6]
 * );
 * ```
 */
export async function sendAlgoliaClickEvent(index, queryId, objectIDs, positions) {
  if (!queryId || !objectIDs || !positions) {
    throw new Error('queryId, objectIDs, and positions are required parameters.')
  }

  if (objectIDs.length !== positions.length) {
    throw new Error('objectIDs and positions must have the same length.')
  }

  const searchEngine = algoliasearch(
    globalConfig.searchEngineConfig.applicationId,
    globalConfig.searchEngineConfig.apiKey
  ).initInsights({
    region: 'us',
  })

  try {
    await searchEngine.pushEvents({
      events: [
        {
          eventType: 'click',
          eventName: 'Content Clicked',
          index: index,
          userToken: globalConfig.railcontentConfig.userId.toString(),
          authenticatedUserToken: globalConfig.railcontentConfig.authToken.replace('|', '-'),
          timestamp: new Date().getTime(),
          objectIDs: objectIDs,
          queryID: queryId,
          positions: positions,
        },
      ],
    })
  } catch (error) {
    // Don't throw as it is not a blocker
    console.error('Error sending search event:', error)
  }
}
