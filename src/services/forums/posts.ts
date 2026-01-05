/**
 * @module Forums
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import { ForumPost } from './types'
import { PaginatedResponse } from '../api/types'
import { markThreadAsRead } from './threads'

const baseUrl = `/api/forums`

export interface CreatePostParams {
  content: string
  brand: string
}

/**
 * Creates a new post under a forum thread.
 *
 * @param threadId
 * @param {CreatePostParams} params - The parameters for creating the post.
 * @returns {Promise<ForumPost>} - A promise that resolves to the created post.
 * @throws {HttpError} - If the request fails.
 */
export async function createPost(threadId: number, params: CreatePostParams): Promise<ForumPost> {
  const { generateForumPostUrl } = await import('../urlBuilder.ts')
  const { fetchThread } = await import('./threads.ts')

  // Fetch thread to get category_id for URL generation
  const thread = await fetchThread(threadId, params.brand)

  // Generate forum post URL
  const contentUrl = generateForumPostUrl({
    brand: params.brand,
    thread: {
      category_id: thread.category_id,
      id: threadId
    }
  }, false)

  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<ForumPost>(`${baseUrl}/v1/threads/${threadId}/posts`, {
    ...params,
    content_url: contentUrl
  })
}

/**
 * Creates a new post under a forum thread.
 *
 * @param postId
 * @param {CreatePostParams} params - The parameters for updating the post.
 * @returns {Promise<ForumPost>} - A promise that resolves to the updated post.
 * @throws {HttpError} - If the request fails.
 */
export async function updatePost(postId: number, params: CreatePostParams): Promise<ForumPost> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.put<ForumPost>(`${baseUrl}/v1/posts/${postId}`, params)
}

/**
 * Fetches a single forum post by ID.
 *
 * @param {number} postId - The ID of the post to fetch.
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @returns {Promise<ForumPost>} - A promise that resolves to the forum post.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function fetchPost(postId: number, brand: string): Promise<ForumPost> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<ForumPost>(`${baseUrl}/v1/posts/${postId}?brand=${brand}`)
}

export interface FetchPostParams {
  page?: number
  limit?: number
  /** Sort order: "-published_on" (default), "published_on", or "mine". */
  sort?: '-published_on' | string
}
/**
 * Fetches posts for the given thread.
 * Automatically marks the thread as read when posts are fetched.
 *
 * @param {number} threadId - The ID of the forum thread.
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @param {FetchPostParams} [params] - Optional parameters such as `page`, `limit`, and `sort`.
 * @returns {Promise<PaginatedResponse<ForumPost>>} - Resolves to a paginated list of forum posts.
 * @throws {HttpError} - If the request fails.
 */
export async function fetchPosts(
  threadId: number,
  brand: string,
  params: FetchPostParams = {}
): Promise<PaginatedResponse<ForumPost>> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const queryObj: Record<string, string> = {
    brand,
    ...Object.fromEntries(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ),
  }
  const query = new URLSearchParams(queryObj).toString()

  const url = `${baseUrl}/v1/threads/${threadId}/posts?${query}`

  // Mark thread as read in background (non-blocking)
  markThreadAsRead(threadId, brand).catch(error => {
    console.error('Failed to mark thread as read:', error)
  })

  return httpClient.get<PaginatedResponse<ForumPost>>(url)
}

/**
 * Like a forum post.
 *
 * @param {number} postId - The ID of the post to like.
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @return {Promise<void>} - A promise that resolves when the post is liked.
 * @throws {HttpError} - If the request fails.
 */
export async function likePost(postId: number, brand: string): Promise<void> {
  const { generateForumPostUrl } = await import('../urlBuilder.ts')

  // Fetch post to get thread info for URL generation
  const post = await fetchPost(postId, brand)

  // Generate forum post URL
  const contentUrl = generateForumPostUrl({
    brand,
    thread: {
      category_id: post.thread.category_id,
      id: post.thread.id
    }
  }, false)

  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<void>(`${baseUrl}/v1/posts/${postId}/likes`, {
    brand,
    content_url: contentUrl
  })
}

/**
 * Unlike a forum post.
 *
 * @param {number} postId - The ID of the post to unlike.
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @return {Promise<void>} - A promise that resolves when the post is unliked.
 * @throws {HttpError} - If the request fails.
 */
export async function unlikePost(postId: number, brand: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const query = new URLSearchParams({ brand }).toString()
  return httpClient.delete<void>(`${baseUrl}/v1/posts/${postId}/likes?${query}`)
}

/**
 * Delete a post.
 *
 * @param {number} postId - The ID of the post to delete.
 * @param {string} brand - The brand associated with the delete action.
 * @return {Promise<void>} - A promise that resolves when the post is deleted.
 * @throws {HttpError} - If the request fails.
 */
export async function deletePost(postId: number, brand: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.delete<void>(`${baseUrl}/v1/posts/${postId}?brand=${brand}`)
}

/**
 * Fetches community guidelines posts for the given brand.
 *
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @returns {Promise<ForumPost[]>} - Resolves to an array of forum posts.
 * @throws {HttpError} - If the request fails.
 */
export async function fetchCommunityGuidelines(brand: string): Promise<ForumPost[]> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const url = `${baseUrl}/v1/rules?brand=${brand}`
  return httpClient.get<ForumPost[]>(url)
}

export interface SearchParams {
  page?: number,
  limit?: number,
  category_id?: number,
  /** Sort order: "-published_on" (default), "published_on", or "mine". */
  sort?: '-published_on' | string
  term?: string
}

/**
 * Search forum posts.
 *
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @param {SearchParams} [params] - Optional search parameters such as `query`, `page`, `limit`, and `sort`.
 * @returns {Promise<PaginatedResponse<ForumPost>>} - Resolves to a paginated list of forum posts.
 * @throws {HttpError} - If the request fails.
 */
export async function search(
  brand: string,
  params: SearchParams
): Promise<PaginatedResponse<ForumPost>> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const queryObj: Record<string, string> = {
    brand,
    ...Object.fromEntries(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ),
  }
  const query = new URLSearchParams(queryObj).toString()

  const url = `${baseUrl}/v1/search?${query}`
  return httpClient.get<PaginatedResponse<ForumPost>>(url)
}

/**
 * Fetches posts for the given post, jumping to the post's location in the thread.
 * Automatically marks the thread as read when posts are fetched.
 *
 * @param {number} postId - The ID of the forum post.
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @param {FetchPostParams} [params] - Optional parameters such as `page`, `limit`, and `sort`.
 * @returns {Promise<PaginatedResponse<ForumPost>>} - Resolves to a paginated list of forum posts.
 * @throws {HttpError} - If the request fails.
 */
export async function jumpToPost(
  postId: number,
  brand: string,
  params: FetchPostParams = {}
): Promise<PaginatedResponse<ForumPost>> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const queryObj: Record<string, string> = {
    brand,
    ...Object.fromEntries(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ),
  }
  const query = new URLSearchParams(queryObj).toString()

  const url = `${baseUrl}/v1/posts/${postId}/jump?${query}`
  const response = await httpClient.get<PaginatedResponse<ForumPost>>(url)

  // Mark thread as read in background (non-blocking)
  // Extract thread from first post if available
  if (response.data.length > 0 && response.data[0].thread?.id) {
    markThreadAsRead(response.data[0].thread.id, brand).catch(error => {
      console.error('Failed to mark thread as read:', error)
    })
  }

  return response
}
