/**
 * @module UrlBuilder
 * @description URL generation for content across Musora platform
 *
 * This is the SINGLE SOURCE OF TRUTH for URL generation.
 * Used by:
 * - musora-platform-frontend (via import)
 * - Mobile apps (via import)
 * - Backend receives these URLs from frontend and stores them in DB
 *
 * Port of: musora-platform-frontend/src/shared/utils/content.utils.ts:generateContentUrl
 * Related: musora-platform-backend/app/Modules/Content/Builders/UrlBuilder.php (deprecated fallback)
 */

import { globalConfig } from './config.js'

/**
 * Generate a frontend URL for content
 *
 * @param {Object} params - Content parameters
 * @param {number|string} params.id - Content ID (required)
 * @param {string} params.type - Content type (required)
 * @param {number} [params.parentId] - Parent content ID (optional)
 * @param {Object} [params.navigateTo] - Navigation target (optional)
 * @param {number} [params.navigateTo.id] - Target content ID
 * @returns {string} The generated URL path
 *
 * @example
 * generateContentUrl({ id: 123, type: 'song' })
 * // Returns: "/songs/transcription/123"
 *
 * @example
 * generateContentUrl({ id: 456, type: 'course-part', parentId: 789 })
 * // Returns: "/lessons/course/789/456"
 *
 * @example
 * generateContentUrl({ id: 123, type: 'pack-bundle', navigateTo: { id: 456 } })
 * // Returns: "/lessons/pack/123/456"
 */
export function generateContentUrl({ id, type, parentId, navigateTo }) {
  // Special case: method homepage
  if (type === 'method') {
    return '/method'
  }

  // Return fallback if required params missing
  if (!id || !type) {
    return '#'
  }

  // Special cases that don't follow the standard pattern
  if (type === 'live') {
    return `/lessons/${id}/live`
  }

  if (type === 'pack') {
    return `/lessons/pack/overview/${id}`
  }

  if (type === 'pack-bundle') {
    return `/lessons/pack/${id}/${navigateTo?.id || ''}`
  }

  // Helper function to build URL with common parameters
  const buildUrl = (typeSegments) => {
    const contentId = navigateTo ? `${id}/${navigateTo.id}` : id
    const parentSegment = parentId ? `/${parentId}` : ''
    return `/${typeSegments.join('/')}${parentSegment}/${contentId}`
  }

  // Determine page type (songs, method, or lessons)
  const songTypes = [
    'song',
    'song-tutorial',
    'transcription',
    'play-along',
    'jam-track',
    'song-tutorial-children',
  ]

  const methodTypes = [
    'learning-path-v2',
    'learning-path-lesson-v2',
  ]

  let pageType
  if (songTypes.includes(type)) {
    pageType = 'songs'
  } else if (methodTypes.includes(type)) {
    pageType = 'method'
  } else {
    pageType = 'lessons'
  }

  // Content type routing - maps specific types to URL segments
  const contentTypeRoutes = {
    // Lesson types
    'course-part': 'course',
    'guided-course-part': 'course',
    'guided-course': 'course',
    'pack-bundle-lesson': 'pack',
    'skill-pack-lesson': 'skill-pack',

    // Method types
    'learning-path-lesson-v2': 'lesson',
    'learning-path-v2': 'lesson',

    // Song types
    'song': 'transcription',
    'song-tutorial': 'tutorial',
    'song-tutorial-children': 'tutorial',
  }

  // Use specific route if available, otherwise fall back to type as-is
  const contentTypeSegment = contentTypeRoutes[type] || type

  return buildUrl([pageType, contentTypeSegment])
}

/**
 * Generate a full URL with domain
 *
 * @param {Object} params - Content parameters (same as generateContentUrl)
 * @returns {string} Full URL with domain from globalConfig.baseUrl
 *
 * @example
 * generateContentUrlWithDomain({ id: 123, type: 'song' })
 * // Returns: "https://www.musora.com/songs/transcription/123"
 */
export function generateContentUrlWithDomain(params) {
  const path = generateContentUrl(params)

  if (path === '#') {
    return '#'
  }

  return  path
}

/**
 * Generate URL for a forum post
 *
 * @param {Object} post - Forum post object
 * @param {string} post.brand - Brand (drumeo, pianote, etc)
 * @param {Object} post.thread - Thread object
 * @param {number} post.thread.category_id - Category ID
 * @param {number} post.thread.id - Thread ID
 * @param {boolean} [withDomain=false] - Include domain from globalConfig.baseUrl
 * @returns {string} Forum post URL
 */
export function generateForumPostUrl(post, withDomain = false) {
  const path = `/${post.brand}/forums/threads/${post.thread.category_id}/${post.thread.id}`

  if (withDomain) {
    return globalConfig.baseUrl + path
  }

  return path
}

/**
 * Generate URL for a user playlist
 *
 * @param {Object} playlist - Playlist object
 * @param {number} playlist.id - Playlist ID
 * @param {boolean} [withDomain=false] - Include domain from globalConfig.baseUrl
 * @returns {string} Playlist URL
 */
export function generatePlaylistUrl(playlist, withDomain = false) {
  const path = `/playlists/${playlist.id}`

  if (withDomain) {
    return globalConfig.baseUrl + path
  }

  return path
}

/**
 * Generate URL for a comment (content URL with anchor)
 *
 * @param {Object} comment - Comment object
 * @param {number} comment.id - Comment ID
 * @param {Object} comment.content - Content object
 * @param {boolean} [withDomain=false] - Include domain from globalConfig.baseUrl
 * @returns {string} Comment URL with anchor
 */
export function generateCommentUrl(comment, withDomain = false) {
  if (!comment.content) {
    return '#'
  }

  const contentUrl = generateContentUrl({
    id: comment.content.id,
    type: comment.content.type,
    parentId: comment.content.parentId,
  })

  if (contentUrl === '#') {
    return '#'
  }

  const path = `${contentUrl}#comment-${comment.id}`

  if (withDomain) {
    return globalConfig.baseUrl + path
  }

  return path
}
