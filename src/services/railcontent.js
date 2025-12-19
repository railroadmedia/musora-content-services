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
const excludeFromGeneratedIndex = [
  'fetchUserPermissionsData',
]

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
  const url = `/content/user_progress/${globalConfig.sessionConfig.userId}?content_ids[]=${content_id}`

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.sessionConfig.token,
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
  const url = `/content/user_progress/${globalConfig.sessionConfig.userId}?${contentIds.map((id) => `content_ids[]=${id}`).join('&')}`

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.sessionConfig.token,
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
  const url = `/content/in_progress/${globalConfig.sessionConfig.userId}?content_type=song&brand=${brand}`

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.sessionConfig.token,
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
    url = `/content/in_progress/${globalConfig.sessionConfig.userId}?brand=${brand}${limitString}${pageString}`
  } else {
    url = `/content/in_progress/${globalConfig.sessionConfig.userId}?content_type=${type}&brand=${brand}${limitString}${pageString}`
  }
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.sessionConfig.token,
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
    url = `/content/completed/${globalConfig.sessionConfig.userId}?brand=${brand}${limitString}${pageString}`
  } else {
    url = `/content/completed/${globalConfig.sessionConfig.userId}?content_type=${type}&brand=${brand}${limitString}${pageString}`
  }
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.sessionConfig.token,
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
  let url = `/api/content/v1/${contentId}/user_data/${globalConfig.sessionConfig.userId}`
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.sessionConfig.token,
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
  let url = `/content/${contentId}/next/${globalConfig.sessionConfig.userId}`
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN': globalConfig.sessionConfig.token,
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

async function postDataHandler(url, data) {
  return fetchHandler(url, 'post', null, data)
}

async function patchDataHandler_depreciated(url, data) {
  throw Error('PATCH verb throws a CORS error on the FEW. Use PATCH instead')
}

async function putDataHandler(url, data) {
  return fetchHandler(url, 'put', null, data)
}

async function deleteDataHandler(url, data) {
  return fetchHandler(url, 'delete')
}

export async function fetchLikeCount(contendId) {
  const url = `/api/content/v1/content/like_count/${contendId}`
  return await fetchHandler(url)
}

export async function postPlaylistContentEngaged(playlistItemId) {
  let url = `/railtracker/v1/last-engaged/${playlistItemId}`
  return postDataHandler(url)
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
 * Set a user's StudentView Flag
 *
 * @param {int|string} userId - id of the user (must be currently authenticated)
 * @param {bool} enable - truthy value to enable student view
 * @returns {Promise<any|null>}
 */
export async function setStudentViewForUser(userId, enable) {
  let url = `/user-management-system/user/update/${userId}`
  let data = { use_student_view: enable ? 1 : 0 }
  return await putDataHandler(url, data)
}

/**
 * Fetch the top comment for a given content
 *
 * @param {int} railcontentId - The railcontent id to fetch.
 * @returns {Promise<Object|null>} - A promise that resolves to an comment object
 */
export async function fetchTopComment(railcontentId) {
  const url = `/api/content/v1/${railcontentId}/comments?filter=top`
  return await fetchHandler(url)
}

/**
 *
 * @param {int} railcontentId
 * @param {int} page
 * @param {int} limit
 * @returns {Promise<*|null>}
 */
export async function fetchComments(railcontentId, page = 1, limit = 20) {
  const url = `/api/content/v1/${railcontentId}/comments?page=${page}&limit=${limit}`
  return await fetchHandler(url)
}

/**
 *
 * @param {int} commentId
 * @param {int} page
 * @param {int} limit
 * @returns {Promise<*|null>}
 */
export async function fetchCommentRelies(commentId, page = 1, limit = 20) {
  const url = `/api/content/v1/comments/${commentId}/replies?page=${page}&limit=${limit}`
  return await fetchHandler(url)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function deleteComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}`
  return await fetchHandler(url, 'DELETE')
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function restoreComment(commentId) {
  const url = `/api/content/v1/comments/restore/${commentId}`
  return await fetchHandler(url, 'POST')
}

/**
 * @param {int} commentId
 * @param {string} comment
 * @returns {Promise<*|null>}
 */
export async function replyToComment(commentId, comment) {
  const { generateCommentUrl } = await import('./urlBuilder.ts')
  const { fetchByRailContentIds } = await import('./sanity.js')

  // Fetch parent comment to get content info
  const parentComment = await fetchComment(commentId)

  if (!parentComment?.content) {
    const data = { comment: comment }
    const url = `/api/content/v1/comments/${commentId}/reply`
    return await postDataHandler(url, data)
  }

  // Fetch content from Sanity to get parentId and correct type
  const contents = await fetchByRailContentIds([parentComment.content.id])
  const content = contents?.[0]

  // Generate content URL
  const contentUrl = content ? generateCommentUrl({
    id: commentId,
    content: {
      id: content.id,
      type: content.type,
      parentId: content.parentId || content.parent_id,
      brand: content.brand
    }
  }, false) : null

  const data = {
    comment: comment,
    ...(contentUrl && { content_url: contentUrl })
  }
  const url = `/api/content/v1/comments/${commentId}/reply`
  return await postDataHandler(url, data)
}

/**
 * @param {int} railcontentId
 * @param {string} comment
 * @returns {Promise<*|null>}
 */
export async function createComment(railcontentId, comment) {
  const { generateContentUrl } = await import('./urlBuilder.ts')
  const { fetchByRailContentIds } = await import('./sanity.js')

  // Fetch content to get type and brand info
  const contents = await fetchByRailContentIds([railcontentId])
  const content = contents?.[0]

  // Generate content URL
  const contentUrl = content ? generateContentUrl({
    id: content.id,
    type: content.type,
    parentId: content.parentId || content.parent_id,
    brand: content.brand
  }) : null

  const data = {
    comment: comment,
    content_id: railcontentId,
    ...(contentUrl && { content_url: contentUrl })
  }
  const url = `/api/content/v1/comments/store`
  return await postDataHandler(url, data)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function assignModeratorToComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}/assign_moderator`
  return await postDataHandler(url)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function unassignModeratorToComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}/unassign_moderator`
  return await postDataHandler(url)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function likeComment(commentId) {
  const { generateCommentUrl } = await import('./urlBuilder.ts')
  const { fetchByRailContentIds } = await import('./sanity.js')

  // Fetch comment to get content info
  const comment = await fetchComment(commentId)

  if (!comment?.content) {
    const url = `/api/content/v1/comments/${commentId}/like`
    return await postDataHandler(url, {})
  }

  // Fetch content from Sanity to get parentId and correct type
  const contents = await fetchByRailContentIds([comment.content.id])
  const content = contents?.[0]

  // Generate content URL
  const contentUrl = content ? generateCommentUrl({
    id: commentId,
    content: {
      id: content.id,
      type: content.type,
      parentId: content.parentId || content.parent_id,
      brand: content.brand
    }
  }, false) : null

  const url = `/api/content/v1/comments/${commentId}/like`
  const data = contentUrl ? { content_url: contentUrl } : {}
  return await postDataHandler(url, data)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function unlikeComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}/like`
  return await deleteDataHandler(url)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function closeComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}`
  const data = {
    conversation_status: 'closed',
  }
  return await putDataHandler(url, data)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function openComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}`
  const data = {
    conversation_status: 'open',
  }
  return await putDataHandler(url, data)
}

/**
 * @param {int} commentId
 * @param {string} comment
 * @returns {Promise<*|null>}
 */
export async function editComment(commentId, comment) {
  const url = `/api/content/v1/comments/${commentId}`
  const data = {
    comment: comment,
  }
  return await putDataHandler(url, data)
}

/**
 * @param {int} commentId
 * @param {string} issue
 * @returns {Promise<*|null>}
 */
export async function reportComment(commentId, issue) {
  const url = `/api/content/v1/comments/${commentId}/report`
  const data = {
    issue: issue,
  }
  return await postDataHandler(url, data)
}

/**
 * Fetches a single comment by its ID.
 *
 * @param {number|string} commentId - The ID of the comment to fetch.
 * @returns {Promise<Object|null>} - A promise that resolves to the comment object if found, otherwise null.
 *
 * @example
 * fetchComment(123)
 *   .then(comment => console.log(comment))
 *   .catch(error => console.error(error));
 */
export async function fetchComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}`
  const comment = await fetchHandler(url)
  return comment.parent ? comment.parent : comment
}

export async function fetchUserPractices(userId) {
  const url = `/api/user/practices/v1/practices?user_id=${userId}`
  const response = await fetchHandler(url)
  const { data } = response
  const userPractices = data
  if (!userPractices) {
    return {}
  }

  const formattedPractices = userPractices.reduce((acc, practice) => {
    if (!acc[practice.date]) {
      acc[practice.date] = []
    }

    acc[practice.date].push({
      id: practice.id,
      duration_seconds: practice.duration_seconds,
    })

    return acc
  }, {})

  return formattedPractices
}

export async function fetchUserPracticeMeta(day, userId) {
  const url = `/api/user/practices/v1/practices?user_id=${userId}&date=${date}`
  return await fetchHandler(url, 'GET', null)
}

/**
 * Fetches user practice notes for a specific date.
 * @param {string} date - The date for which to fetch practice notes (format: YYYY-MM-DD).
 * @returns {Promise<Object|null>} - A promise that resolves to an object containing the practice notes if found, otherwise null.
 *
 * @example
 * fetchUserPracticeNotes('2025-04-10')
 *   .then(notes => console.log(notes))
 *   .catch(error => console.error(error));
 */
export async function fetchUserPracticeNotes(date) {
  const url = `/api/user/practices/v1/notes?date=${date}`
  return await fetchHandler(url, 'GET', null)
}

/**
 * Get the id and slug of last interacted child. Only valid for certain content types
 *
 * @async
 * @function fetchLastInteractedChild
 * @param {array} content_ids - Content ids of to get the last interacted child of
 *
 *
 * @returns {Promise<Object>} - keyed object per valid content ids with the child
 *
 * @example
 * try {
 *   const response = await fetchLastInteractedChild([191369, 410427]);
 *   console.log('child id', response[191369].content_id)
 *   console.log('child slug', response[191369].slug)
 * } catch (error) {
 *   console.error('Failed to get children', error);
 * }
 */
export async function fetchLastInteractedChild(content_ids) {
  const params = new URLSearchParams()
  content_ids.forEach((id) => params.append('content_ids[]', id))
  const url = `/api/content/v1/user/last_interacted_child?${params.toString()}`
  return await fetchHandler(url, 'GET', null)
}

/**
 * @typedef {Object} Activity
 * @property {string} id - Unique identifier for the activity.
 * @property {string} type - Type of activity (e.g., "lesson_completed").
 * @property {string} timestamp - ISO 8601 string of when the activity occurred.
 * @property {Object} meta - Additional metadata related to the activity.
 */

/**
 * @typedef {Object} PaginatedActivities
 * @property {number} currentPage
 * @property {number} totalPages
 * @property {Activity[]} data
 */

/**
 * Fetches a paginated list of recent user activities.
 * @param {Object} [params={}] - Optional parameters.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of results per page.
 * @param {string|null} [params.tabName=null] - Optional filter for activity type/tab.
 * @returns {Promise<PaginatedActivities>} - A promise that resolves to a paginated object of user activities.
 *
 * @example
 * fetchRecentUserActivities({ page: 2, limit: 5 })
 *   .then(activities => console.log(activities))
 *   .catch(error => console.error(error));
 */
export async function fetchRecentUserActivities({ page = 1, limit = 5, tabName = null } = {}) {
  let pageAndLimit = `?page=${page}&limit=${limit}`
  let tabParam = tabName ? `&tabName=${tabName}` : ''
  const url = `/api/user-management-system/v1/activities/all${pageAndLimit}${tabParam}`
  return await fetchHandler(url, 'GET', null)
}

function fetchAbsolute(url, params) {
  if (globalConfig.sessionConfig.authToken) {
    params.headers['Authorization'] = `Bearer ${globalConfig.sessionConfig.authToken}`
  }

  if (globalConfig.baseUrl) {
    if (url.startsWith('/')) {
      return fetch(globalConfig.baseUrl + url, params)
    }
  }
  return fetch(url, params)
}
export async function fetchHandler(url, method = 'get', dataVersion = null, body = null) {
  return fetchJSONHandler(
    url,
    globalConfig.sessionConfig.token,
    globalConfig.baseUrl,
    method,
    dataVersion,
    body
  )
}
  export async function fetchResponseHandler(url, method = 'get', {dataVersion = null, body = null, fullResponse = true, logError = true}) {
    return fetchJSONHandler(
      url,
      globalConfig.sessionConfig.token,
      globalConfig.baseUrl,
      method,
      dataVersion,
      body,
      fullResponse,
      logError,
    )
}
