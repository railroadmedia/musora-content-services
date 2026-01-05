/**
 * @module ProgressRow
 */
import { getMethodCard } from './rows/method-card.js'
import {
  getPlaylistCards,
  getPlaylistEngagedOnContent,
  getRecentPlaylists,
  processPlaylistItem,
} from './rows/playlist-card.js'
import { globalConfig } from '../config.js'
import { getContentCardMap, processContentItem } from './rows/content-card.js'
import { fetchByRailContentIds } from '../sanity.js'
import { addContextToContent } from '../contentAggregator.js'
import { fetchPlaylist } from '../content-org/playlists.js'
import { TabResponseType } from '../../contentMetaData.js'
import { PUT } from '../../infrastructure/http/HttpClient.js'


/**
 * Fetches and combines recent user progress rows and playlists, excluding certain types and parents.
 *
 * @param {Object} [options={}] - Options for fetching progress rows.
 * @param {string|null} [options.brand=null] - The brand context for progress data.
 * @param {number} [options.limit=8] - Maximum number of progress rows to return.
 * @returns {Promise<Object>} - A promise that resolves to an object containing progress rows formatted for UI.
 *
 * @example
 * getProgressRows({ brand: 'drumeo', limit: 10 })
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */
export async function getProgressRows({ brand = 'drumeo', limit = 8 } = {}) {
  const [userPinnedItem, recentPlaylists] = await Promise.all([
    getUserPinnedItem(brand),
    getRecentPlaylists(brand, limit)
  ])
  const playlistEngagedOnContent = await getPlaylistEngagedOnContent(recentPlaylists)
  const [contentCardMap, playlistCards, methodCard] = await Promise.all([
    getContentCardMap(brand, limit, playlistEngagedOnContent, userPinnedItem),
    getPlaylistCards(recentPlaylists),
    getMethodCard(brand),
  ])
  const pinnedCard = await popPinnedItem(userPinnedItem, contentCardMap, playlistCards, methodCard)
  let allResultsLength = playlistCards.length + contentCardMap.size
  if (methodCard) {
    allResultsLength += 1
  }
  const results = sortCards(pinnedCard, contentCardMap, playlistCards, methodCard, limit)
  return {
    type: TabResponseType.PROGRESS_ROWS,
    displayBrowseAll: allResultsLength > limit,
    data: results,
  }
}

/**
 * Pins a specific progress row for a user, scoped by brand.
 *
 * @param {string} brand - The brand context for the pin action.
 * @param {number|string} id - The ID of the progress item to pin.
 * @param {string} progressType - The type of progress (e.g., 'content', 'playlist').
 * @returns {Promise<Object>} - A promise resolving to the response from the pin API.
 *
 * @example
 * pinProgressRow('drumeo', 12345, 'content')
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function pinProgressRow(brand, id, progressType) {
  const url = `/api/user-management-system/v1/progress/pin?brand=${brand}&id=${id}&progressType=${progressType}`
  const response = await PUT(url, null)
  if (response && !response.error) {
    await updateUserPinnedProgressRow(brand, {
      id,
      progressType,
      pinnedAt: new Date().toISOString(),
    })
  }
  return response
}

/**
 * Unpins the current pinned progress row for a user, scoped by brand.
 *
 * @param {string} brand - The brand context for the unpin action.
 * @returns {Promise<Object>} - A promise resolving to the response from the unpin API.
 *
 * @example
 * unpinProgressRow('drumeo', 123456)
 *   .then(response => console.log(response))
 *   .catch(error => console.error(error));
 */
export async function unpinProgressRow(brand) {
  const url = `/api/user-management-system/v1/progress/unpin?brand=${brand}`
  const response = await PUT(url, null)
  if (response && !response.error) {
    await updateUserPinnedProgressRow(brand, null)
  }
  return response
}

async function getUserPinnedItem(brand) {
  const userRaw = await globalConfig.localStorage.getItem('user')
  const user = userRaw ? JSON.parse(userRaw) : {}
  user.brand_pinned_progress = user.brand_pinned_progress || {}
  return user.brand_pinned_progress[brand] ?? null
}

/**
 * Pop the userPinnedItem from cards and return it.
 * If userPinnedItem is not found, generate the pinned card from scratch.
 *
 **/
async function popPinnedItem(userPinnedItem, contentCardMap, playlistCards, methodCard){
  if (!userPinnedItem) return null
  const pinnedId = parseInt(userPinnedItem.id)
  const pinnedAt = userPinnedItem.pinnedAt
  const progressType = userPinnedItem.progressType ?? userPinnedItem.type

  let item = null
  if (progressType === 'content') {
    if (contentCardMap.has(pinnedId)) {
      item = contentCardMap.get(pinnedId)
      contentCardMap.delete(pinnedId)
    } else {
      // we use fetchByRailContentIds so that we don't have the _type restriction in the query
      let data = await fetchByRailContentIds([pinnedId], 'progress-tracker')
      item = await processContentItem(await addContextToContent(() => data[0] ?? null, {
        addNextLesson: true,
        addNavigateTo: true,
        addProgressStatus: true,
        addProgressPercentage: true,
        addProgressTimestamp: true,
      }))
    }
  } else if (progressType === 'playlist') {
    const pinnedPlaylist = playlistCards.find((p) => p.playlist.id === pinnedId)
    if (pinnedPlaylist) {
      item = pinnedPlaylist
    } else {
      const playlist = await fetchPlaylist(pinnedId)
      item = await processPlaylistItem({
        id: pinnedId,
        playlist: playlist,
        type: 'playlist',
        progressTimestamp: new Date(pinnedAt).getTime(),
      })
    }
  } else if (progressType === 'method') {
    // simply get method card and return
    item = methodCard
    //todo remove method card
  }
  return item
}

/**
 * Order cards by progress timestamp, move pinned card to the front,
 * remove any duplicate cards showing the same content twice,
 * slice the result based on the provided limit.
 **/
function sortCards(pinnedCard, contentCardMap, playlistCards, methodCard, limit) {
  let combined = []
  if (pinnedCard) {
    pinnedCard.pinned = true
    combined.push(pinnedCard)
  }

  if (!(pinnedCard && pinnedCard.progressType === 'method')) {
    combined.push(methodCard)
  }

  const progressList = Array.from(contentCardMap.values())
  return mergeAndSortItems([...combined, ...progressList, ...playlistCards], limit)
}

function mergeAndSortItems(items, limit) {
  const seen = new Set()
  const deduped = []

  for (const item of items) {
    const key = `${item.id}-${item.progressType}`
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(item)
    }
  }

  return deduped
    .filter((item) => typeof item.progressTimestamp === 'number' && item.progressTimestamp >= 0)
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.progressTimestamp - a.progressTimestamp
    })
    .slice(0, limit)
}

async function updateUserPinnedProgressRow(brand, pinnedData) {
  const userRaw = await globalConfig.localStorage.getItem('user')
  const user = userRaw ? JSON.parse(userRaw) : {}
  user.brand_pinned_progress = user.brand_pinned_progress || {}
  user.brand_pinned_progress[brand] = pinnedData
  await globalConfig.localStorage.setItem('user', JSON.stringify(user))
}
