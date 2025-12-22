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
  const result = await GET(url)

  if (result && result[content_id]) {
    return result[content_id]
  }
  return null
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
  return await GET(url)
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
  return await GET(url)
}

/**
 * Fetches a list of content that is currently in progress for the current user.
 *
 * @param {string} type - The content type associated with the content.
 * @param {string} brand - The brand associated with the content.
 * @param {number} [options.limit=20] - The limit of results per page.
 * @param {number} [options.page=1] - The page number for pagination.
 * @returns {Promise<Object|null>} - Returns an object containing in-progress content if found, otherwise null.
 * @example
 * fetchContentInProgress('song', 'drumeo')
 *   .then(songs => console.log(songs))
 *   .catch(error => console.error(error));
 */
export async function fetchContentInProgress(type = 'all', brand, { page, limit } = {}) {
  const limitString = limit ? `&limit=${limit}` : ''
  const pageString = page ? `&page=${page}` : ''
  const contentTypeParam = type === 'all' ? '' : `content_type=${type}&`
  const url = `/content/in_progress/${globalConfig.sessionConfig.userId}?${contentTypeParam}brand=${brand}${limitString}${pageString}`
  return await GET(url)
}

/**
 * Fetches a list of content that has been completed for the current user.
 *
 * @param {string} type - The content type associated with the content.
 * @param {string} brand - The brand associated with the content.
 * @param {number} [options.limit=20] - The limit of results per page.
 * @param {number} [options.page=1] - The page number for pagination.
 * @returns {Promise<Object|null>} - Returns an object containing in-progress content if found, otherwise null.
 * @example
 * fetchCompletedContent('song', 'drumeo')
 *   .then(songs => console.log(songs))
 *   .catch(error => console.error(error));
 */
export async function fetchCompletedContent(type = 'all', brand, { page, limit } = {}) {
  const limitString = limit ? `&limit=${limit}` : ''
  const pageString = page ? `&page=${page}` : ''
  const contentTypeParam = type === 'all' ? '' : `content_type=${type}&`
  const url = `/content/completed/${globalConfig.sessionConfig.userId}?${contentTypeParam}brand=${brand}${limitString}${pageString}`
  return await GET(url)
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
  const url = `/api/content/v1/${contentId}/user_data/${globalConfig.sessionConfig.userId}`
  return await GET(url)
}

/**
 * Fetches the ID and Type of the piece of content that would be the next one for the user
 *
 * @param {int} contentId - The id of the parent (method, level, or course) piece of content.
 * @returns {Promise<Object|null>} - Returns and Object with the id and type of the next piece of content if found, otherwise null.
 */
export async function fetchNextContentDataForParent(contentId) {
  const url = `/content/${contentId}/next/${globalConfig.sessionConfig.userId}`
  const result = await GET(url)
  return result?.next ?? null
}

export async function fetchUserPermissionsData() {
  const url = `/content/user/permissions`
  return (await GET(url)) ?? []
}

export async function fetchLikeCount(contendId) {
  const url = `/api/content/v1/content/like_count/${contendId}`
  return await GET(url)
}

export async function postPlaylistContentEngaged(playlistItemId) {
  const url = `/railtracker/v1/last-engaged/${playlistItemId}`
  return await POST(url, null)
}

/**
 * Fetch the user's best award for this challenge
 *
 * @param contentId - railcontent id of the challenge
 * @returns {Promise<any|null>} - streamed PDF
 */
export async function fetchUserAward(contentId) {
  const url = `/challenges/download_award/${contentId}`
  return await GET(url)
}

/**
 * Fetch All Carousel Card Data
 *
 * @returns {Promise<any|null>}
 */
export async function fetchCarouselCardData(brand = null) {
  const brandParam = brand ? `?brand=${brand}` : ''
  const url = `/api/v2/content/carousel${brandParam}`
  return await GET(url)
}

/**
 * Fetch all completed badges for the user ordered by completion date descending
 *
 * @param {string|null} brand -
 * @returns {Promise<any|null>}
 */
export async function fetchUserBadges(brand = null) {
  const brandParam = brand ? `?brand=${brand}` : ''
  const url = `/challenges/user_badges/get${brandParam}`
  return await GET(url)
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
