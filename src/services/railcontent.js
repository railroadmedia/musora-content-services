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
  const data = { comment: comment }
  const url = `/api/content/v1/comments/${commentId}/reply`
  return await postDataHandler(url, data)
}

/**
 * @param {int} railcontentId
 * @param {string} comment
 * @returns {Promise<*|null>}
 */
export async function createComment(railcontentId, comment) {
  const data = {
    comment: comment,
    content_id: railcontentId,
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
  const url = `/api/content/v1/comments/${commentId}/like`
  return await postDataHandler(url)
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
