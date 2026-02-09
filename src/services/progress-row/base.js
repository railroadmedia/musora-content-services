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
import { GET, PUT } from '../../infrastructure/http/HttpClient.ts'
import { postProcessBadge } from "../../contentTypeConfig.js";

export const USER_PIN_PROGRESS_KEY = 'user_pin_progress_row'
const CACHE_EXPIRY_MS = 5 * 60 * 1000

/**
 * Retrieves user's pinned data by brand, from localStorage or BE call.
 * @param brand
 * @returns {Promise<any|*|{id, type}>}
 */
async function getUserPinnedItem(brand) {
  const key = getUserPinProgressKey()

  const pinnedProgress = await getStoredPinnedData(key)
  const cachedData = pinnedProgress[brand]

  if (isCacheValid(cachedData)) {
    delete cachedData.cachedAt // is for internal use
    return cachedData === {}
      ? null
      : cachedData
  }

  const url = `/api/user-management-system/v1/progress/pin?brand=${brand}`
  try {
    const response = await GET(url)
    if (response === "" || (response && !response.error)) { // "" is 204 case
      return await setUserBrandPinnedItem(brand, response)
    }
    return response
  } catch (error) {
      return null
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
    return await setUserBrandPinnedItem(brand, {
      id,
      progressType,
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
    await setUserBrandPinnedItem(brand, null)
  }
  return response
}

/**
 * Gets the localStorage key for user pinned progress, scoped by user ID
 */
export function getUserPinProgressKey(id) {
  const userId = id || globalConfig.sessionConfig?.userId || globalConfig.railcontentConfig?.userId
  return USER_PIN_PROGRESS_KEY + `_${userId}`
}

export async function setUserPinnedProgressRow(userId, pinnedData) {
  const key = getUserPinProgressKey(userId)

  pinnedData.map(item => ({...item, cachedAt: Date.now()}))
  await globalConfig.localStorage.setItem(key, JSON.stringify(pinnedData))
}

async function setUserBrandPinnedItem(brand, pinnedData) {
  if (!brand) return

  const key = getUserPinProgressKey()
  let pinnedProgress = await getStoredPinnedData(key)

  const processed = pinnedData && typeof pinnedData === 'object'
    ? pinnedData
    : null

  pinnedProgress[brand] = setPinnedData(processed)
  await globalConfig.localStorage.setItem(key, JSON.stringify(pinnedProgress))
  return processed
}

async function getStoredPinnedData(key) {
  const pinnedProgressRaw = await globalConfig.localStorage.getItem(key)
  const pinnedProgress = pinnedProgressRaw ? JSON.parse(pinnedProgressRaw) : {}
  return pinnedProgress || {}
}

function setPinnedData(pinnedData) {
  const now = Date.now()
  return {
    ...pinnedData,
    cachedAt: now
  }
}

function isCacheValid(cachedData) {
  return cachedData?.cachedAt && (Date.now() - cachedData.cachedAt) < CACHE_EXPIRY_MS
}

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
    getRecentPlaylists(brand, limit),
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
 * Pop the userPinnedItem from cards and return it.
 * If userPinnedItem is not found, generate the pinned card from scratch.
 *
 **/
async function popPinnedItem(userPinnedItem, contentCardMap, playlistCards, methodCard) {
  if (!userPinnedItem) return null
  const pinnedId = parseInt(userPinnedItem.id)
  const progressType = userPinnedItem.progressType ?? userPinnedItem.type

  let item = null
  if (progressType === 'content') {
    if (contentCardMap.has(pinnedId)) {
      item = contentCardMap.get(pinnedId)
      contentCardMap.delete(pinnedId)
    } else {
      // we use fetchByRailContentIds so that we don't have the _type restriction in the query
      let data = await fetchByRailContentIds([pinnedId], 'progress-tracker')
      data = postProcessBadge(data)
      item = await processContentItem(
        await addContextToContent(() => data[0] ?? null, {
          addNextLesson: true,
          addNavigateTo: true,
          addProgressStatus: true,
          addProgressPercentage: true,
          addProgressTimestamp: true,
        })
      )
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
        progressTimestamp: new Date().getTime(),
      })
    }
  } else if (progressType === 'method') {
    // simply get method card and return
    item = methodCard
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

  const progressList = Array.from(contentCardMap.values())

  combined = [...combined, ...progressList, ...playlistCards]

  // welcome card state will only show if pinned
  if (methodCard && methodCard.type !== 'method') {
    combined.push(methodCard)
  }

  return mergeAndSortItems(combined, limit)
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
