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
  'fetchUserLikes',
  'postContentLiked',
  'postContentUnliked',
  'postRecordWatchSession',
  'postContentStarted',
  'postContentCompleted',
  'postContentReset',
  'fetchUserPermissionsData',
]

let challengeIndexMetaDataPromise = null

/**
 * Fetches the completion status of a specific lesson for the current user.
 *
 * @param {string} content_id - The ID of the lesson content to check.
 * @returns {Promise<Object|null>} - Returns the completion status object if found, otherwise null.
 * @example
 * fetchCurrentSongComplete('user123', 'lesson456', 'csrf-token')
 *   .then(status => console.log(status))
 *   .catch(error => console.error(error));
 */
export async function fetchCompletedState(content_id) {
  const url = `/content/user_progress/${globalConfig.railcontentConfig.userId}?content_ids[]=${content_id}`

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.railcontentConfig.token,
  }

  try {
    const response = await fetchAbsolute(url, { headers })
    const result = await response.json()

    if (result && result[content_id]) {
      return result[content_id] // Return the correct object
    } else {
      return null // Handle unexpected structure
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

/**
 * Fetches the completion status for multiple songs for the current user.
 *
 * @param {Array<string>} contentIds - An array of content IDs to check.
 * @returns {Promise<Object|null>} - Returns an object containing completion statuses keyed by content ID, or null if an error occurs.
 * @example
 * fetchAllCompletedStates('user123', ['song456', 'song789'], 'csrf-token')
 *   .then(statuses => console.log(statuses))
 *   .catch(error => console.error(error));
 */
export async function fetchAllCompletedStates(contentIds) {
  const url = `/content/user_progress/${globalConfig.railcontentConfig.userId}?${contentIds.map((id) => `content_ids[]=${id}`).join('&')}`

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.railcontentConfig.token,
  }

  try {
    const response = await fetchAbsolute(url, { headers })
    const result = await response.json()
    if (result) {
      return result
    } else {
      console.log('result not json')
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

/**
 * Fetches a list of songs that are currently in progress for the current user.
 *
 * @param {string} brand - The brand associated with the songs.
 * @returns {Promise<Object|null>} - Returns an object containing in-progress songs if found, otherwise null.
 * @example
 * fetchSongsInProgress('drumeo')
 *   .then(songs => console.log(songs))
 *   .catch(error => console.error(error));
 */
export async function fetchSongsInProgress(brand) {
  const url = `/content/in_progress/${globalConfig.railcontentConfig.userId}?content_type=song&brand=${brand}`

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.railcontentConfig.token,
  }

  try {
    const response = await fetchAbsolute(url, { headers })
    const result = await response.json()
    if (result) {
      //console.log('fetchSongsInProgress', result);
      return result
    } else {
      console.log('result not json')
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

/**
 * Fetches a list of content that is currently in progress for the current user.
 *
 * @param {string} type - The content type associated with the content.
 * @param {string} brand - The brand associated with the content.
 * @param {number} [params.limit=20] - The limit of results per page.
 * @param {number} [params.page=1] - The page number for pagination.
 * @returns {Promise<Object|null>} - Returns an object containing in-progress content if found, otherwise null.
 * @example
 * fetchContentInProgress('song', 'drumeo')
 *   .then(songs => console.log(songs))
 *   .catch(error => console.error(error));
 */
export async function fetchContentInProgress(type = 'all', brand, { page, limit } = {}) {
  let url
  const limitString = limit ? `&limit=${limit}` : ''
  const pageString = page ? `&page=${page}` : ''

  if (type === 'all') {
    url = `/content/in_progress/${globalConfig.railcontentConfig.userId}?brand=${brand}${limitString}${pageString}`
  } else {
    url = `/content/in_progress/${globalConfig.railcontentConfig.userId}?content_type=${type}&brand=${brand}${limitString}${pageString}`
  }
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.railcontentConfig.token,
  }
  try {
    const response = await fetchAbsolute(url, { headers })
    const result = await response.json()
    if (result) {
      //console.log('contentInProgress', result);
      return result
    } else {
      console.log('result not json')
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

/**
 * Fetches a list of content that has been completed for the current user.
 *
 * @param {string} type - The content type associated with the content.
 * @param {string} brand - The brand associated with the content.
 * @param {number} [params.limit=20] - The limit of results per page.
 * @param {number} [params.page=1] - The page number for pagination.
 * @returns {Promise<Object|null>} - Returns an object containing in-progress content if found, otherwise null.
 * @example
 * fetchCompletedContent('song', 'drumeo')
 *   .then(songs => console.log(songs))
 *   .catch(error => console.error(error));
 */
export async function fetchCompletedContent(type = 'all', brand, { page, limit } = {}) {
  let url
  const limitString = limit ? `&limit=${limit}` : ''
  const pageString = page ? `&page=${page}` : ''

  if (type === 'all') {
    url = `/content/completed/${globalConfig.railcontentConfig.userId}?brand=${brand}${limitString}${pageString}`
  } else {
    url = `/content/completed/${globalConfig.railcontentConfig.userId}?content_type=${type}&brand=${brand}${limitString}${pageString}`
  }
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.railcontentConfig.token,
  }
  try {
    const response = await fetchAbsolute(url, { headers })
    const result = await response.json()
    if (result) {
      //console.log('completed content', result);
      return result
    } else {
      console.log('result not json')
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

/**
 * Fetches user context data for a specific piece of content.
 *
 * @param {int} contentId - The content id.
 * @returns {Promise<Object|null>} - Returns an object containing user context data if found, otherwise null.
 * @example
 * fetchContentPageUserData(406548)
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */
export async function fetchContentPageUserData(contentId) {
  let url = `/content/${contentId}/user_data/${globalConfig.railcontentConfig.userId}`
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.railcontentConfig.token,
  }

  try {
    const response = await fetchAbsolute(url, { headers })
    const result = await response.json()
    if (result) {
      console.log('fetchContentPageUserData', result)
      return result
    } else {
      console.log('result not json')
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

/**
 * Fetches the ID and Type of the piece of content that would be the next one for the user
 *
 * @param {int} contentId - The id of the parent (method, level, or course) piece of content.
 * @returns {Promise<Object|null>} - Returns and Object with the id and type of the next piece of content if found, otherwise null.
 */
export async function fetchNextContentDataForParent(contentId) {
  let url = `/content/${contentId}/next/${globalConfig.railcontentConfig.userId}`
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN': globalConfig.railcontentConfig.token,
  }

  try {
    const response = await fetchAbsolute(url, { headers })
    const result = await response.json()
    if (result) {
      // console.log('fetchNextContentDataForParent', result);
      return result.next
    } else {
      console.log('fetchNextContentDataForParent result not json')
      return null
    }
  } catch (error) {
    console.error('Fetch error:', error)
    return null
  }
}

export async function fetchUserPermissionsData() {
  let url = `/content/user/permissions`
  // in the case of an unauthorized user, we return empty permissions
  return (await fetchHandler(url, 'get')) ?? []
}

async function fetchDataHandler(url, dataVersion, method = 'get') {
  return fetchHandler(url, method, dataVersion)
}

async function postDataHandler(url, data) {
  return fetchHandler(url, 'post', null, data)
}

async function patchDataHandler(url, data) {
  return fetchHandler(url, 'patch', null, data)
}

export async function fetchHandler(url, method = 'get', dataVersion = null, body = null) {
  let headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.railcontentConfig.token,
  }

  if (!globalConfig.isMA) {
    const params = new URLSearchParams(window.location.search)
    if (params.get('testNow')) {
      headers['testNow'] = params.get('testNow')
    }
    if (params.get('timezone')) {
      headers['M-Client-Timezone'] = params.get('timezone')
    }
  }

  if (globalConfig.localTimezoneString) {
    headers['M-Client-Timezone'] = globalConfig.localTimezoneString
  }

  if (globalConfig.railcontentConfig.authToken) {
    headers['Authorization'] = `Bearer ${globalConfig.railcontentConfig.authToken}`
  }

  if (dataVersion) headers['Data-Version'] = dataVersion
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

export async function fetchUserLikes(currentVersion) {
  let url = `/content/user/likes/all`
  return fetchDataHandler(url, currentVersion)
}

export async function postContentLiked(contentId) {
  let url = `/content/user/likes/like/${contentId}`
  return await postDataHandler(url)
}

export async function postContentUnliked(contentId) {
  let url = `/content/user/likes/unlike/${contentId}`
  return await postDataHandler(url)
}

export async function fetchContentProgress(currentVersion) {
  let url = `/content/user/progress/all`
  return fetchDataHandler(url, currentVersion)
}

export async function postRecordWatchSession(
  contentId,
  mediaTypeId,
  mediaLengthSeconds,
  currentSeconds,
  secondsPlayed,
  sessionId
) {
  let url = `/railtracker/v2/media-playback-session`
  return postDataHandler(url, {
    content_id: contentId,
    media_type_id: mediaTypeId,
    media_length_seconds: mediaLengthSeconds,
    current_second: currentSeconds,
    seconds_played: secondsPlayed,
    session_id: sessionId,
  })
}

/**
 * Fetch enrolled user data for a given challenge. Intended to be used in the enrolled modal
 *
 * @param contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function fetchChallengeMetadata(contentId) {
  let url = `/challenges/${contentId}`
  return await fetchHandler(url, 'get')
}

/**
 * Fetch lesson, user, and challenge data for a given lesson
 *
 * @param contentId - railcontent id of the lesson
 * @returns {Promise<any|null>}
 */
export async function fetchChallengeLessonData(contentId) {
  let url = `/challenges/lessons/${contentId}`
  return await fetchHandler(url, 'get')
}

/**
 * Fetch all owned brand challenges for user
 * @param {string|null} brand - brand
 * @param {int} page - page of data to pull
 * @param {int} limit - number of elements to pull
 * @returns {Promise<any|null>}
 */
export async function fetchOwnedChallenges(brand = null, page, limit) {
  let brandParam = brand ? `&brand=${brand}` : ''
  let pageAndLimit = `?page=${page}&limit=${limit}`
  let url = `/challenges/tab_owned/get${pageAndLimit}${brandParam}`
  return await fetchHandler(url, 'get')
}

/**
 * Fetch all completed brand challenges for user
 * @param {string|null} brand - brand
 * @param {int} page - page of data to pull
 * @param {int} limit - number of elements to pull
 * @returns {Promise<any|null>}
 */
export async function fetchCompletedChallenges(brand = null, page, limit) {
  let brandParam = brand ? `&brand=${brand}` : ''
  let pageAndLimit = `?page=${page}&limit=${limit}`
  let url = `/challenges/tab_completed/get${pageAndLimit}${brandParam}`
  return await fetchHandler(url, 'get')
}

/**
 * Fetch challenge, lesson, and user metadata for a given challenge
 *
 * @param contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function fetchUserChallengeProgress(contentId) {
  let url = `/challenges/user_data/${contentId}`
  return await fetchHandler(url, 'get')
}

/**
 * Fetch the user's best award for this challenge
 *
 * @param contentId - railcontent id of the challenge
 * @returns {Promise<any|null>} - streamed PDF
 */
export async function fetchUserAward(contentId) {
  let url = `/challenges/download_award/${contentId}`
  return await fetchHandler(url, 'get')
}

/**
 * Get challenge duration, user progress, and status for the list of challenges
 * Intended to be used on the index page for challenges
 *
 * @param {array} contentIds - arary of railcontent ids of the challenges
 * @returns {Promise<any|null>}
 */
export async function fetchChallengeIndexMetadata(contentIds) {
  if (!challengeIndexMetaDataPromise) {
    challengeIndexMetaDataPromise = getChallengeIndexMetadataPromise()
  }
  let results = await challengeIndexMetaDataPromise
  if (Array.isArray(contentIds)) {
    results = results.filter(function (challenge) {
      return contentIds.includes(challenge.content_id)
    })
  }
  return results
}

async function getChallengeIndexMetadataPromise() {
  let url = `/challenges/user_progress_for_index_page/get`
  const result = await fetchHandler(url, 'get')
  challengeIndexMetaDataPromise = null
  return result
}

/**
 * Get active brand challenges for the authorized user
 *
 * @returns {Promise<any|null>}
 */
export async function fetchChallengeUserActiveChallenges(brand = null) {
  let brandParam = brand ? `?brand=${brand}` : ''
  let url = `/challenges/user_active_challenges/get${brandParam}`
  return await fetchHandler(url, 'get')
}

/**
 * Fetch All Carousel Card Data
 *
 * @returns {Promise<any|null>}
 */
export async function fetchCarouselCardData(brand = null) {
  const brandParam = brand ? `?brand=${brand}` : ''
  let url = `/api/v2/content/carousel${brandParam}`
  return await fetchHandler(url, 'get')
}

/**
 * Fetch all completed badges for the user ordered by completion date descending
 *
 * @param {string|null} brand -
 * @returns {Promise<any|null>}
 */
export async function fetchUserBadges(brand = null) {
  let brandParam = brand ? `?brand=${brand}` : ''
  let url = `/challenges/user_badges/get${brandParam}`
  return await fetchHandler(url, 'get')
}

/**
 * Enroll a user in a challenge and set the start date of the challenge to the provided day.
 * Clears any existing progress data for this challenge
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @param {string} startDate - prefered format YYYYMMDD, but any Carbon parsable string will do.
 * @returns {Promise<any|null>}
 */
export async function postChallengesSetStartDate(contentId, startDate) {
  let url = `/challenges/set_start_date/${contentId}?start_date=${startDate}`
  return await fetchHandler(url, 'post')
}

/**
 * Enroll the user in the provided challenge and set to unlocked
 * Clears any current progress data for this challenge
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function postChallengesUnlock(contentId) {
  let url = `/challenges/unlock/${contentId}`
  return await fetchHandler(url, 'post')
}

/**
 * Enroll the user in the given challenge on the challenge published_on date
 *  Clears any current progress data for this challenge
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function postChallengesEnroll(contentId) {
  let url = `/challenges/enroll/${contentId}`
  return await fetchHandler(url, 'post')
}

/**
 * Remove the user from the provided challenge
 * Clears any current progress data for this challenge
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function postChallengesLeave(contentId) {
  let url = `/challenges/leave/${contentId}`
  return await fetchHandler(url, 'post')
}

/**
 * Enable enrollment notifications for the provided challenge
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function postChallengesEnrollmentNotification(contentId) {
  let url = `/challenges/notifications/enrollment_open/${contentId}`
  return await fetchHandler(url, 'post')
}

/**
 * Enable community notifications for the provided challenge
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function postChallengesCommunityNotification(contentId) {
  let url = `/challenges/notifications/community_reminders/${contentId}`
  return await fetchHandler(url, 'post')
}

/**
 * Enable solo notifications for the provided challenge
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function postChallengesSoloNotification(contentId) {
  let url = `/challenges/notifications/solo_reminders/${contentId}`
  return await fetchHandler(url, 'post')
}

/**
 * Complete the challenge lesson and update challenge progress
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>} - Modal data to display
 */
export async function postChallengesCompleteLesson(contentId) {
  let url = `/challenges/complete_lesson/${contentId}`
  await contentStatusCompleted(contentId)
  return await fetchHandler(url, 'post')
}

/**
 * Hide challenge completed award bannare
 *
 * @param {int|string} contentId - railcontent id of the challenge
 * @returns {Promise<any|null>}
 */
export async function postChallengesHideCompletedBanner(contentId) {
  let url = `/challenges/hide_completed_banner/${contentId}`
  return await fetchHandler(url, 'post')
}

/**
 * Fetches user playlists for a specific brand.
 *
 * Allows optional pagination, sorting, and search parameters to control the result set.
 *
 * @param {string} brand - The brand identifier for which playlists are being fetched.
 * @param {number} [params.limit=10] - The maximum number of playlists to return per page (default is 10).
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {string} [params.sort='-created_at'] - The sorting order for the playlists (default is by created_at in descending order).
 * @param {string} [params.searchTerm] - A search term to filter playlists by name.
 * @param {int|string} [params.content_id] - If content_id exists, the endpoint checks in each playlist if we have the content in the items.
 *
 * @returns {Promise<Object|null>} - A promise that resolves to the response from the API, containing the user playlists data.
 *
 * @example
 * fetchUserPlaylists('drumeo', { page: 1, sort: 'name', searchTerm: 'rock' })
 *   .then(playlists => console.log(playlists))
 *   .catch(error => console.error(error));
 */
export async function fetchUserPlaylists(
  brand,
  { page, limit, sort, searchTerm, content_id, categories } = {}
) {
  let url
  const limitString = limit ? `&limit=${limit}` : ''
  const pageString = page ? `&page=${page}` : ''
  const sortString = sort ? `&sort=${sort}` : ''
  const searchFilter = searchTerm ? `&term=${searchTerm}` : ''
  const content = content_id ? `&content_id=${content_id}` : ''
  const categoryString =
    categories && categories.length ? categories.map((cat) => `categories[]=${cat}`).join('&') : ''
  url = `/api/content/v1/user/playlists/all?brand=${brand}${limitString}${pageString}${sortString}${searchFilter}${content}${categoryString ? `&${categoryString}` : ''}`
  return await fetchHandler(url)
}

/**
 * Duplicates an existing playlist by sending a POST request to the API.
 *
 * This function calls the `/playlists/duplicate` endpoint, where the server replicates the specified playlist,
 * including its items. Optionally, new `name`, `description`, `category`, or `thumbnail_url` parameters can be provided
 * to customize the duplicated playlist. If a new name is not provided, the server appends " (Duplicate)" to the original name.
 *
 * @param {string|number} playlistId - The unique identifier of the playlist to be duplicated.
 * @param {Object} [playlistData] - Optional data to customize the duplicated playlist.
 * @param {string} [playlistData.name] - New name for the duplicated playlist (default is original name + " (Duplicate)").
 * @param {string} [playlistData.description] - New description for the duplicated playlist (defaults to original description).
 * @param {string} [playlistData.category] - New category for the duplicated playlist (defaults to original category).
 * @param {string} [playlistData.thumbnail_url] - New URL for the duplicated playlist thumbnail (defaults to original thumbnail).
 *
 * @returns {Promise<Object>} - A promise that resolves to the duplicated playlist data, or rejects with an error if the duplication fails.
 *
 * The duplicated playlist contains:
 *  - `name` (string): Name of the new playlist.
 *  - `description` (string|null): Description of the duplicated playlist.
 *  - `category` (string|null): Category of the duplicated playlist.
 *  - `thumbnail_url` (string|null): URL of the playlist thumbnail.
 *  - `items` (Array): A list of items (e.g., songs, tracks) copied from the original playlist.
 *
 * @example
 * duplicatePlaylist(12345, { name: "My New Playlist" })
 *   .then(duplicatedPlaylist => console.log(duplicatedPlaylist))
 *   .catch(error => console.error('Error duplicating playlist:', error));
 */
export async function duplicatePlaylist(playlistId, playlistData) {
  let url = `/playlists/duplicate/${playlistId}`
  return await fetchHandler(url, 'post', null, playlistData)
}

/**
 * Deletes a user’s playlist along with all associated items by sending a DELETE request to the API.
 *
 * This function calls the `/playlists/playlist` endpoint, where the server verifies the user’s ownership of the specified playlist.
 * If the user is authorized, it deletes both the playlist and its associated items.
 *
 * @param {string|number} playlistId - The unique identifier of the playlist to be deleted.
 *
 * @returns {Promise<Object>} - A promise that resolves to an object containing:
 *  - `success` (boolean): Indicates if the deletion was successful (`true` for success).
 *  - `message` (string): Success confirmation message (e.g., "Playlist and associated items deleted successfully").
 *
 * If the user is unauthorized or the playlist does not exist, the promise rejects with an error.
 *
 * @example
 * deletePlaylist(12345)
 *   .then(response => {
 *       if (response.success) {
 *           console.log(response.message);
 *       }
 *   })
 *   .catch(error => console.error('Error deleting playlist:', error));
 */
export async function deletePlaylist(playlistId) {
  let url = `/playlists/playlist/${playlistId}`
  return await fetchHandler(url, 'delete')
}

/**
 * Updates a user’s playlist by sending a PUT request with updated data to the API.
 *
 * This function calls the `/playlists/playlist/{playlistId}` endpoint, where the server validates the incoming data
 * and verifies that the authenticated user is the playlist owner. If authorized, it updates the playlist details with the provided data.
 *
 * @param {string|number} playlistId - The unique identifier of the playlist to be updated.
 * @param {Object} updatedData - An object containing the playlist data to update. The possible fields include:
 *  - `name` (string): The new name of the playlist (max 255 characters).
 *  - `description` (string): A new description for the playlist (max 1000 characters).
 *  - `category` (string): The updated category of the playlist (max 255 characters).
 *  - `private` (boolean): Whether the playlist is private.
 *  - `thumbnail_url` (string): The URL of the playlist thumbnail.
 *
 * @returns {Promise<Object>} - A promise that resolves to an object containing:
 *  - `success` (boolean): Indicates if the update was successful (`true` for success).
 *  - `message` (string): Success confirmation message if the update is successful.
 *  - Other fields containing the updated playlist data.
 *
 * If the user is unauthorized or the data validation fails, the promise rejects with an error.
 *
 * @example
 * updatePlaylist(12345, { name: "My New Playlist Name", description: "Updated description" })
 *   .then(response => {
 *       if (response.success) {
 *           console.log(response.message);
 *       }
 *   })
 *   .catch(error => console.error('Error updating playlist:', error));
 */
export async function updatePlaylist(playlistId, updatedData) {
  const url = `/playlists/playlist/${playlistId}`
  return await fetchHandler(url, 'PUT', null, updatedData)
}

/**
 * Creates a new user playlist by sending a POST request with playlist data to the API.
 *
 * This function calls the `/playlists/playlist` endpoint, where the server validates the incoming data and associates
 * the new playlist with the authenticated user. The `name` field is required, while other fields are optional.
 *
 * @param {Object} playlistData - An object containing data to create the playlist. The fields include:
 *  - `name` (string): The name of the new playlist (required, max 255 characters).
 *  - `description` (string): A description of the playlist (optional, max 1000 characters).
 *  - `category` (string): The category of the playlist.
 *  - `thumbnail_url` (string): The URL of the playlist thumbnail (optional, must be a valid URL).
 *  - `private` (boolean): Whether the playlist is private (optional, defaults to true).
 *  - `brand` (string): Brand identifier for the playlist.
 *
 * @returns {Promise<Object>} - A promise that resolves to the created playlist data if successful, or an error response if validation fails.
 *
 * The server response includes:
 *  - `message`: Success message indicating playlist creation (e.g., "Playlist created successfully").
 *  - `playlist`: The data for the created playlist, including the `user_id` of the authenticated user.
 *
 * @example
 * createPlaylist({ name: "My Playlist", description: "A cool playlist", private: true })
 *   .then(response => console.log(response.message))
 *   .catch(error => console.error('Error creating playlist:', error));
 */
export async function createPlaylist(playlistData) {
  const url = `/api/content/v1/user/playlists/playlist`
  return await fetchHandler(url, 'POST', null, playlistData)
}

/**
 * Sends a request to "like" a playlist on behalf of the authenticated user.
 *
 * This function calls the `/playlists/playlist/like` endpoint, where the server validates the `playlist_id` and checks
 * if the authenticated user has already liked the playlist. If not, it creates a new "like" entry associated with the playlist.
 *
 * @param {string|number} playlistId - The unique identifier of the playlist to be liked.
 *
 * @returns {Promise<Object>} - A promise that resolves with the response from the API. The response contains:
 *  - `success` (boolean): Indicates if the like action was successful (`true` for success).
 *  - `message` (string): A success message if the playlist is liked successfully, or a notification if it was already liked.
 *  - `like` (Object|null): Details of the created "like" entry if the playlist is newly liked, or null if it was already liked.
 *
 * The `like` object in the response includes:
 *  - `playlist_id`: The ID of the liked playlist.
 *  - `user_id`: The ID of the user who liked the playlist.
 *  - `brand`: The brand associated with the like.
 *  - `created_at`: Timestamp of when the like was created.
 *
 * @example
 * likePlaylist(12345)
 *   .then(response => {
 *       if (response.success) {
 *           console.log(response.message);
 *       }
 *   })
 *   .catch(error => console.error('Error liking playlist:', error));
 */
export async function likePlaylist(playlistId) {
  const url = `/playlists/like`
  const payload = { playlist_id: playlistId }
  return await fetchHandler(url, 'PUT', null, payload)
}

/**
 * Removes a "like" from a playlist for the authenticated user.
 *
 * This function sends a DELETE request to the `/playlists/like` endpoint, where the server validates the `playlist_id`
 * and checks if a like by the authenticated user already exists for the specified playlist. If so, it deletes the like.
 *
 * @param {string|number} playlistId - The unique identifier of the playlist whose like is to be removed.
 *
 * @returns {Promise<Object>} - A promise that resolves with the response from the API. The response contains:
 *  - `success` (boolean): Indicates if the removal was successful (`true` for success).
 *  - `message` (string): A success message if the playlist like is removed successfully or a notification if the playlist was not previously liked.
 *
 * @example
 * deletePlaylistLike(12345)
 *   .then(response => {
 *       if (response.success) {
 *           console.log(response.message);
 *       }
 *   })
 *   .catch(error => console.error('Error removing playlist like:', error));
 */
export async function deletePlaylistLike(playlistId) {
  const url = `/playlists/like`
  const payload = { playlist_id: playlistId }
  return await fetchHandler(url, 'DELETE', null, payload)
}

/**
 * Retrieves details of a specific playlist by its ID.
 *
 * This function sends a GET request to the `/playlists/playlist` endpoint with a specified playlist ID.
 * The server validates the user's access to the playlist and returns playlist details if the user is authorized.
 *
 * @param {string|number} playlistId - The unique identifier of the playlist to retrieve.
 *
 * @returns {Promise<Object>} - A promise that resolves to the response from the API, containing:
 *  - `data` (Object): The playlist details, or an error message if access is denied or the playlist is not found.
 *
 * @example
 * fetchPlaylist(12345)
 *   .then(response => console.log(response.data))
 *   .catch(error => console.error('Error fetching playlist:', error));
 */
export async function fetchPlaylist(playlistId) {
  const url = `/playlists/playlist/${playlistId}`
  return await fetchHandler(url, 'GET')
}

/**
 * Retrieves items within a specified playlist by playlist ID.
 *
 * This function sends a GET request to the `/playlists/playlist-lessons` endpoint to fetch items in the given playlist.
 * The server combines data from the playlist and additional metadata from Sanity to enhance item details.
 *
 * @param {string|number} playlistId - The unique identifier of the playlist whose items are to be fetched.
 *
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of playlist items
 *
 * @example
 * fetchPlaylistItems(12345)
 *   .then(items => console.log(items))
 *   .catch(error => console.error('Error fetching playlist items:', error));
 */
export async function fetchPlaylistItems(playlistId, { sort } = {}) {
  const sortString = sort ? `&sort=${sort}` : ''
  const url = `/playlists/playlist-lessons?playlist_id=${playlistId}${sortString}`
  return await fetchHandler(url, 'GET')
}

/**
 * Updates a playlist item with the provided data.
 *
 * @param {Object} updatedData - The data to update the playlist item with.
 * @param {number} updatedData.user_playlist_item_id - The ID of the playlist item to update.
 * @param {number} [updatedData.start_second] - (Optional) The start time in seconds for the item.
 * @param {number} [updatedData.end_second] - (Optional) The end time in seconds for the item.
 * @param {string} [updatedData.playlist_item_name] - (Optional) The new name for the playlist item.
 * @param {number} [updatedData.position] - (Optional) The new position for the playlist item within the playlist.
 * @returns {Promise<Object|null>} - A promise that resolves to an object containing:
 *  - `success` (boolean): Indicates if the update was successful (`true` for success).
 *  - `data` (Object): The updated playlist item data.
 *
 * Resolves to `null` if the request fails.
 * @throws {Error} - Throws an error if the request fails.
 *
 * @example
 * const updatedData = {
 *   user_playlist_item_id: 123,
 *   start_second: 30,
 *   end_second: 120,
 *   playlist_item_name: "Updated Playlist Item Name",
 *   position: 2
 * };
 *
 * updatePlaylistItem(updatedData)
 *   .then(response => {
 *     if (response.success) {
 *       console.log("Playlist item updated successfully:", response.data);
 *     }
 *   })
 *   .catch(error => {
 *     console.error("Error updating playlist item:", error);
 *   });
 */
export async function updatePlaylistItem(updatedData) {
  const url = `/playlists/item`
  return await fetchHandler(url, 'POST', null, updatedData)
}

/**
 * Deletes a playlist item and repositions other items in the playlist if necessary.
 *
 * @param {Object} payload - The data required to delete the playlist item.
 * @param {number} payload.user_playlist_item_id - The ID of the playlist item to delete.
 * @returns {Promise<Object|null>} - A promise that resolves to an object containing:
 *  - `success` (boolean): Indicates if the deletion was successful (`true` for success).
 *  - `message` (string): A success message if the item is deleted successfully.
 *  - `error` (string): An error message if the deletion fails.
 *
 * Resolves to `null` if the request fails.
 * @throws {Error} - Throws an error if the request fails.
 *
 * @example
 * const payload = {
 *   user_playlist_item_id: 123
 * };
 *
 * deletePlaylistItem(payload)
 *   .then(response => {
 *     if (response.success) {
 *       console.log("Playlist item deleted successfully:", response.message);
 *     } else {
 *       console.error("Error:", response.error);
 *     }
 *   })
 *   .catch(error => {
 *     console.error("Error deleting playlist item:", error);
 *   });
 */
export async function deletePlaylistItem(payload) {
  const url = `/playlists/item`
  return await fetchHandler(url, 'DELETE', null, payload)
}

/**
 * Fetches detailed data for a specific playlist item, including associated Sanity and Assignment information if available.
 *
 * @param {Object} payload - The request payload containing necessary parameters.
 * @param {number} payload.user_playlist_item_id - The unique ID of the playlist item to fetch.
 * @returns {Promise<Object|null>} - A promise that resolves to an object with the fetched playlist item data, including:
 *  - `success` (boolean): Indicates if the data retrieval was successful (`true` on success).
 *  - `data` (Object): Contains the detailed playlist item data enriched with Sanity and Assignment details, if available.
 *
 * Resolves to `null` if the request fails.
 * @throws {Error} - Throws an error if the request encounters issues during retrieval.
 *
 * @example
 * const payload = { user_playlist_item_id: 123 };
 *
 * fetchPlaylistItem(payload)
 *   .then(response => {
 *     if (response?.success) {
 *       console.log("Fetched playlist item data:", response.data);
 *     } else {
 *       console.log("Failed to fetch playlist item data.");
 *     }
 *   })
 *   .catch(error => {
 *     console.error("Error fetching playlist item:", error);
 *   });
 */
export async function fetchPlaylistItem(payload) {
  const playlistItemId = payload.user_playlist_item_id
  const url = `/playlists/item/${playlistItemId}`
  return await fetchHandler(url)
}

export async function postContentCompleted(contentId) {
  let url = `/content/user/progress/complete`
  return postDataHandler(url, { contentId: contentId })
}

export async function postContentReset(contentId) {
  let url = `/content/user/progress/reset`
  return postDataHandler(url, { contentId: contentId })
}

/**
 * Adds an item to one or more playlists by making a POST request to the `/playlists/add-item` endpoint.
 *
 * @param {Object} payload - The request payload containing necessary parameters.
 * @param {number} payload.content_id - The ID of the content to add to the playlist(s).
 * @param {Array<number>} payload.playlist_id - An array of playlist IDs where the content should be added.
 * @param {boolean} [payload.import_full_soundslice_assignment=false] - Flag to include full Soundslice assignments.
 * @param {boolean} [payload.import_instrumentless_soundslice_assignment=false] - Flag to include instrumentless Soundslice assignments.
 * @param {boolean} [payload.import_high_routine=false] - Flag to include high routine content.
 * @param {boolean} [payload.import_low_routine=false] - Flag to include low routine content.
 * @param {boolean} [payload.import_all_assignments=false] - Flag to include all Soundslice assignments if true.
 *
 * @returns {Promise<Object|null>} - A promise that resolves to an object with the response data, including:
 *  - `success` (boolean): Indicates if the items were added successfully (`true` on success).
 *  - `limit_excedeed` (Array): A list of playlists where the item limit was exceeded, if any.
 *  - `successful` (Array): A list of successfully added items (empty if none).
 *
 * Resolves to `null` if the request fails.
 * @throws {Error} - Throws an error if the request encounters issues during the operation.
 *
 * @example
 * const payload = {
 *     content_id: 123,
 *     playlist_id: [1, 2, 3],
 *     import_all_assignments: true
 * };
 *
 * addItemToPlaylist(payload)
 *   .then(response => {
 *     if (response?.success) {
 *       console.log("Item(s) added to playlist successfully");
 *     }
 *     if (response?.limit_excedeed) {
 *       console.warn("Some playlists exceeded the item limit:", response.limit_excedeed);
 *     }
 *   })
 *   .catch(error => {
 *     console.error("Error adding item to playlist:", error);
 *   });
 */
export async function addItemToPlaylist(payload) {
  const url = `/api/content/v1/user/playlists/add-item`
  return await fetchHandler(url, 'POST', null, payload)
}

/**
 * Retrieves the count of lessons and assignments associated with a specific content ID.
 *
 * @param {number} contentId - The ID of the content for which to count lessons and assignments.
 *
 * @returns {Promise<Object|null>} - A promise that resolves to an object containing the counts:
 *  - `lessons_count` (number): The number of lessons associated with the content.
 *  - `soundslice_assignments_count` (number): The number of Soundslice assignments associated with the content.
 *
 * @example
 * const contentId = 123;
 *
 * countAssignmentsAndLessons(contentId)
 *   .then(response => {
 *     if (response) {
 *       console.log("Lessons count:", response.lessons_count);
 *       console.log("Soundslice assignments count:", response.soundslice_assignments_count);
 *     } else {
 *       console.log("Failed to retrieve counts.");
 *     }
 *   })
 *   .catch(error => {
 *     console.error("Error fetching assignments and lessons count:", error);
 *   });
 */
export async function countAssignmentsAndLessons(contentId) {
  const url = `/playlists/count-lessons-and-assignments/${contentId}`
  return await fetchHandler(url)
}

/**
 * Pins a playlist to the user's playlist menu.
 *
 * @param {number} playlistId - The ID of the playlist to pin.
 * @returns {Promise<Object>} - A promise that resolves to an object containing:
 *  - `success` (boolean): Indicates if the pinning operation was successful (`true` for success).
 *  - `message` (string): A success message if the playlist was pinned successfully.
 *  - `error` (string): An error message if the pinning operation fails.
 *
 * Resolves to an error message if the request fails.
 * @throws {Error} - Throws an error if the request fails.
 *
 * @example
 * const playlistId = 123;
 *
 * pinPlaylist(playlistId)
 *   .then(response => {
 *     if (response.success) {
 *       console.log("Playlist pinned successfully:", response.message);
 *     } else {
 *       console.error("Error:", response.error);
 *     }
 *   })
 *   .catch(error => {
 *     console.error("Error pinning playlist:", error);
 *   });
 */
export async function pinPlaylist(playlistId) {
  const url = `/playlists/pin/${playlistId}`
  return await fetchHandler(url, 'PUT')
}

/**
 * Unpins a playlist
 *
 * @param {number} playlistId - The ID of the playlist to unpin.
 * @returns {Promise<Object>} - A promise that resolves to an object containing:
 *  - `success` (boolean): Indicates if the unpinning operation was successful (`true` for success).
 *  - `message` (string): A success message if the playlist was unpinned successfully.
 *  - `error` (string): An error message if the unpinning operation fails.
 *
 * Resolves to an error message if the request fails.
 * @throws {Error} - Throws an error if the request fails.
 *
 * @example
 * const playlistId = 123;
 *
 * unpinPlaylist(playlistId)
 *   .then(response => {
 *     if (response.success) {
 *       console.log("Playlist unpinned successfully:", response.message);
 *     } else {
 *       console.error("Error:", response.error);
 *     }
 *   })
 *   .catch(error => {
 *     console.error("Error unpinning playlist:", error);
 *   });
 */
export async function unpinPlaylist(playlistId) {
  const url = `/playlists/unpin/${playlistId}`
  return await fetchHandler(url, 'PUT')
}

/**
 * Fetches the list of pinned playlists for the authenticated user.
 *
 * @param {string} brand - The brand associated with the playlists to fetch.
 * @returns {Promise<Object>} - A promise that resolves to an object containing:
 *  - `success` (boolean): Indicates if the fetching operation was successful (`true` for success).
 *  - `data` (Array): An array of pinned playlists.
 *  - `error` (string): An error message if the fetching operation fails.
 *
 * Resolves to an error message if the request fails.
 * @throws {Error} - Throws an error if the request fails.
 *
 * @example
 * const brand = "drumeo";
 *
 * fetchPinnedPlaylists(brand)
 *   .then(response => {
 *     if (response.success) {
 *       console.log("Pinned playlists:", response.data);
 *     } else {
 *       console.error("Error:", response.error);
 *     }
 *   })
 *   .catch(error => {
 *     console.error("Error fetching pinned playlists:", error);
 *   });
 */
export async function fetchPinnedPlaylists(brand) {
  const url = `/playlists/my-pinned-playlists?brand=${brand}`
  return await fetchHandler(url, 'GET')
}

/**
 * Report playlist endpoint
 *
 * @param playlistId
 * @param issue
 * @returns {Promise<any|null>}
 */
export async function reportPlaylist(playlistId, { issue } = {}) {
  const issueString = issue ? `?issue=${issue}` : ''
  const url = `/playlists/report/${playlistId}${issueString}`
  return await fetchHandler(url, 'PUT')
}

export async function playback(playlistId) {
  const url = `/playlists/play/${playlistId}`
  return await fetchHandler(url, 'GET')
}

/**
 * Set a user's StudentView Flag
 *
 * @param {int|string} userId - id of the user (must be currently authenticated)
 * @param {bool} enable - truthsy value to enable student view
 * @returns {Promise<any|null>}
 */
export async function setStudentViewForUser(userId, enable) {
  let url = `/user-management-system/user/update/${userId}`
  let data = { use_student_view: enable ? 1 : 0 }
  return await patchDataHandler(url, data)
}


/**
 * Fetch the top comment for a given content
 *
 * @param {int} railcontentId - The railcontent id to fetch.
 * @returns {Promise<Object|null>} - A promise that resolves to an comment object
 */
export async function fetchTopComment(railcontentId) {
  const url = `/api/content/v1/comments/${railcontentId}/top`
  return await fetchHandler(url)
}


/**
 *
 * @param railcontentId
 * @param page
 * @param limit
 * @returns {Promise<*|null>}
 */
export async function fetchComments(railcontentId, page = 1, limit = 20) {
  const url = `/api/content/v1/comments/${railcontentId}/all?page=${page}&limit=${limit}`
  return await fetchHandler(url)
}

/**
 *
 * @param commentId
 * @param page
 * @param limit
 * @returns {Promise<*|null>}
 */
export async function fetchCommentRelies(commentId, page = 1, limit = 20) {
  const url = `/api/content/v1/comments/${commentId}/replies?page=${page}&limit=${limit}`
  return await fetchHandler(url)
}

function fetchAbsolute(url, params) {
  if (globalConfig.railcontentConfig.authToken) {
    params.headers['Authorization'] = `Bearer ${globalConfig.railcontentConfig.authToken}`
  }

  if (globalConfig.railcontentConfig.baseUrl) {
    if (url.startsWith('/')) {
      return fetch(globalConfig.railcontentConfig.baseUrl + url, params)
    }
  }
  return fetch(url, params)
}
