/**
 * @module Railcontent-Services
 */
import { globalConfig } from './config.js'
import { GET, POST, PUT, DELETE } from '../infrastructure/http/HttpClient.ts'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = ['fetchUserPermissionsData']


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
  const url = `/api/content/v1/${contentId}/user_data/${globalConfig.sessionConfig.userId}`
  return await GET(url)
}

export async function fetchUserPermissionsData() {
  const url = `/content/user/permissions`
  return (await GET(url)) ?? []
}

export async function fetchLikeCount(contendId) {
  const url = `/api/content/v1/content/like_count/${contendId}`
  return await GET(url)
}

/**
 * @param {number} contentId
 * @returns {Promise<{hls_url: string|null, status: string, vimeo_event_id: string|null}>}
 */
export async function fetchLiveStreamData(contentId) {
  const url = `/api/content/v1/live-events/${contentId}/stream`
  return await GET(url)
}

export async function postPlaylistContentEngaged(playlistItemId) {
  const url = `/railtracker/v1/last-engaged/${playlistItemId}`
  return await POST(url, null)
}

/**
 * Set a user's StudentView Flag
 *
 * @param {int|string} userId - id of the user (must be currently authenticated)
 * @param {boolean} enable - truthy value to enable student view
 * @returns {Promise<any|null>}
 */
export async function setStudentViewForUser(userId, enable) {
  const url = `/user-management-system/user/update/${userId}`
  const data = { use_student_view: enable ? 1 : 0 }
  return await PUT(url, data)
}

/**
 * Fetch the top comment for a given content
 *
 * @param {int} railcontentId - The railcontent id to fetch.
 * @returns {Promise<Object|null>} - A promise that resolves to an comment object
 */
export async function fetchTopComment(railcontentId) {
  const url = `/api/content/v1/${railcontentId}/comments?filter=top`
  return await GET(url)
}

/**
 * @param {int} railcontentId
 * @param {int} page
 * @param {int} limit
 * @returns {Promise<*|null>}
 */
export async function fetchComments(railcontentId, page = 1, limit = 20) {
  const url = `/api/content/v1/${railcontentId}/comments?page=${page}&limit=${limit}`
  return await GET(url)
}

/**
 * @param {int} commentId
 * @param {int} page
 * @param {int} limit
 * @returns {Promise<*|null>}
 */
export async function fetchCommentRelies(commentId, page = 1, limit = 20) {
  const url = `/api/content/v1/comments/${commentId}/replies?page=${page}&limit=${limit}`
  return await GET(url)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function deleteComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}`
  return await DELETE(url)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function restoreComment(commentId) {
  const url = `/api/content/v1/comments/restore/${commentId}`
  return await POST(url, null)
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
    const url = `/api/content/v1/comments/${commentId}/reply`
    return await POST(url, { comment })
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
  return await POST(url, data)
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
  return await POST(url, data)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function assignModeratorToComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}/assign_moderator`
  return await POST(url, null)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function unassignModeratorToComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}/unassign_moderator`
  return await POST(url, null)
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
    return await POST(url, null)
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
  return await POST(url, data)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function unlikeComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}/like`
  return await DELETE(url)
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function closeComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}`
  return await PUT(url, { conversation_status: 'closed' })
}

/**
 * @param {int} commentId
 * @returns {Promise<*|null>}
 */
export async function openComment(commentId) {
  const url = `/api/content/v1/comments/${commentId}`
  return await PUT(url, { conversation_status: 'open' })
}

/**
 * @param {int} commentId
 * @param {string} comment
 * @returns {Promise<*|null>}
 */
export async function editComment(commentId, comment) {
  const url = `/api/content/v1/comments/${commentId}`
  return await PUT(url, { comment })
}

/**
 * @param {int} commentId
 * @param {string} issue
 * @returns {Promise<*|null>}
 */
export async function reportComment(commentId, issue) {
  const url = `/api/content/v1/comments/${commentId}/report`
  return await POST(url, { issue })
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
  const comment = await GET(url)
  return comment.parent ? comment.parent : comment
}

export async function fetchUserPractices(userId) {
  const url = `/api/user/practices/v1/practices?user_id=${userId}`
  const response = await GET(url)
  const { data } = response
  if (!data) {
    return {}
  }

  return data.reduce((acc, practice) => {
    if (!acc[practice.date]) {
      acc[practice.date] = []
    }

    acc[practice.date].push({
      id: practice.id,
      duration_seconds: practice.duration_seconds,
    })

    return acc
  }, {})
}

export async function fetchUserPracticeMeta(day, userId) {
  const url = `/api/user/practices/v1/practices?user_id=${userId}&date=${day}`
  return await GET(url)
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
  return await GET(url)
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
  const pageAndLimit = `?page=${page}&limit=${limit}`
  const tabParam = tabName ? `&tabName=${tabName}` : ''
  const url = `/api/user-management-system/v1/activities/all${pageAndLimit}${tabParam}`
  return await GET(url)
}
