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
import { Brands } from '../lib/brands.js'
import { LEARNING_PATH_LESSON } from '../contentTypeConfig.js'
import { COLLECTION_TYPE } from "./sync/models/ContentProgress";

/**
 * Brand type - accepts enum values or string
 */
export type Brand = Brands | string

/**
 * Parameters for generating content URLs
 */
export interface ContentUrlParams {
  /** Content ID (required) */
  id: number | string
  /** Content type (required) */
  type: string
  /** Parent content ID (optional) */
  parentId?: number
  /** Navigation target (optional) */
  navigateTo?: {
    id: number
  }
  /** Brand (drumeo, pianote, guitareo, singeo, playbass) */
  brand?: Brand
}

/**
 * Forum post object for URL generation
 */
export interface ForumPostUrlParams {
  /** Brand (drumeo, pianote, etc) */
  brand: Brand
}

/**
 * Playlist object for URL generation
 */
export interface PlaylistUrlParams {
  /** Playlist ID */
  id: number
}

/**
 * Comment object for URL generation
 */
export interface CommentUrlParams {
  /** Comment ID */
  id: number
  /** Content information */
  content: {
    /** Content ID */
    id: number
    /** Content type */
    type: string
    /** Parent content ID (optional) */
    parentId?: number
    /** Brand */
    brand: Brand
  }
}

/**
 * Generate a frontend URL for content
 *
 * @param params - Content parameters
 * @returns The generated URL path
 *
 * @example
 * generateContentUrl({ id: 123, type: 'song', brand: 'drumeo' })
 * // Returns: "/drumeo/songs/transcription/123"
 *
 * @example
 * generateContentUrl({ id: 456, type: 'course-part', parentId: 789, brand: 'pianote' })
 * // Returns: "/pianote/lessons/course/789/456"
 *
 * @example
 * generateContentUrl({ id: 123, type: 'pack-bundle', navigateTo: { id: 456 }, brand: 'guitareo' })
 * // Returns: "/guitareo/lessons/pack/123/456"
 */
export function generateContentUrl({
  id,
  type,
  parentId,
  navigateTo,
  brand = 'drumeo',
}: ContentUrlParams): string {
  // Special case: method homepage
  if (type === 'method') {
    return `/${brand}/method`
  }

  // Return fallback if required params missing
  if (!id || !type) {
    return '#'
  }

  // Special cases that don't follow the standard pattern
  if (type === 'live') {
    return `/${brand}/lessons/${id}/live`
  }

  if (type === 'pack') {
    return `/${brand}/lessons/pack/overview/${id}`
  }

  if (type === 'pack-bundle') {
    if (navigateTo?.id) {
      return `/${brand}/lessons/pack/${id}/${navigateTo.id}`
    }
    // Fallback to overview if navigateTo is missing
    return `/${brand}/lessons/pack/overview/${id}`
  }

  // Helper function to build URL with common parameters
  const buildUrl = (typeSegments: string[]): string => {
    const contentId = navigateTo ? `${id}/${navigateTo.id}` : id
    const parentSegment = parentId ? `/${parentId}` : ''
    return `/${brand}/${typeSegments.join('/')}${parentSegment}/${contentId}`
  }

  // Determine page type (songs, method, or lessons)
  const songTypes = [
    'song',
    'song-tutorial',
    'song-tutorial-lesson',
    'transcription',
    'play-along',
    'jam-track',
  ]

  const methodTypes = [COLLECTION_TYPE.LEARNING_PATH, LEARNING_PATH_LESSON]

  let pageType: string
  if (songTypes.includes(type)) {
    pageType = 'songs'
  } else if (methodTypes.includes(type)) {
    pageType = 'method'
  } else {
    pageType = 'lessons'
  }

  // Content type routing - maps specific types to URL segments
  const contentTypeRoutes: Record<string, string> = {
    // Lesson types
    'course-lesson': 'course',
    'guided-course-lesson': 'course',
    'guided-course': 'course',
    'pack-bundle-lesson': 'pack',
    'documentary-lesson': 'documentary',
    'skill-pack-lesson': 'skill-pack',

    // Method types
    'learning-path-lesson-v2': 'lesson',
    'learning-path-v2': 'lesson',

    // Song types
    song: 'transcription',
    'song-tutorial': 'tutorial',
    'song-tutorial-lesson': 'tutorial',
  }

  // Use specific route if available, otherwise fall back to type as-is
  const contentTypeSegment = contentTypeRoutes[type] || type

  return buildUrl([pageType, contentTypeSegment])
}

/**
 * Generate a full URL with domain
 *
 * @param params - Content parameters (same as generateContentUrl)
 * @returns Full URL with domain from globalConfig.frontendUrl
 *
 * @example
 * generateContentUrlWithDomain({ id: 123, type: 'song' })
 * // Returns: "https://www.musora.com/drumeo/songs/transcription/123"
 */
export function generateContentUrlWithDomain(params: ContentUrlParams): string {
  const path = generateContentUrl(params)

  if (path === '#') {
    return '#'
  }

  return globalConfig.frontendUrl + path
}

/**
 * Generate URL for a forum post
 *
 * @param post - Forum post object
 * @param withDomain - Include domain from globalConfig.frontendUrl
 * @returns Forum post URL
 *
 * @example
 * generateForumPostUrl({ brand: 'drumeo'})
 * // Returns: "/drumeo/forums/jump-to-post/"
 */
export function generateForumPostUrl(
  post: ForumPostUrlParams,
  withDomain: boolean = false
): string {
  const path = `/${post.brand}/forums/jump-to-post/`

  if (withDomain) {
    return globalConfig.frontendUrl + path
  }

  return path
}

/**
 * Generate URL for a user playlist
 *
 * @param playlist - Playlist object
 * @param withDomain - Include domain from globalConfig.frontendUrl
 * @returns Playlist URL
 *
 * @example
 * generatePlaylistUrl({ id: 123 })
 * // Returns: "/playlists/123"
 */
export function generatePlaylistUrl(
  playlist: PlaylistUrlParams,
  withDomain: boolean = false
): string {
  const path = `/playlists/${playlist.id}`

  if (withDomain) {
    return globalConfig.frontendUrl + path
  }

  return path
}

/**
 * Generate URL for a comment (content URL with anchor)
 *
 * @param comment - Comment object
 * @param withDomain - Include domain from globalConfig.frontendUrl
 * @returns Comment URL with anchor
 *
 * @example
 * generateCommentUrl({
 *   id: 789,
 *   content: { id: 123, type: 'song', brand: 'drumeo' }
 * })
 * // Returns: "/drumeo/songs/transcription/123#comment-789"
 */
export function generateCommentUrl(
  comment: CommentUrlParams,
  withDomain: boolean = false
): string {
  if (!comment.content) {
    return '#'
  }

  const contentUrl = generateContentUrl({
    id: comment.content.id,
    type: comment.content.type,
    parentId: comment.content.parentId,
    brand: comment.content.brand,
  })

  if (contentUrl === '#') {
    return '#'
  }

  const path = `${contentUrl}#comment-${comment.id}`

  if (withDomain) {
    return globalConfig.frontendUrl + path
  }

  return path
}
