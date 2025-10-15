/**
 * @module Forums
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import {ForumPost} from './types'
import { PaginatedResponse } from '../api/types'

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
export async function createPost(
  threadId: number,
  params: CreatePostParams
): Promise<ForumPost> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<ForumPost>(`${baseUrl}/v1/threads/${threadId}/posts`, params)
}

export interface FetchPostParams {
  page?: number,
  limit?: number,
  /** Sort order: "-published_on" (default), "published_on", or "mine". */
  sort?: '-published_on' | string
}
/**
 * Fetches posts for the given thread.
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
  const queryObj: Record<string, string> = { brand, ...Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)])
    )}
  const query = new URLSearchParams(queryObj).toString()

  const url = `${baseUrl}/v1/threads/${threadId}/posts?${query}`
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
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<void>(`${baseUrl}/v1/posts/${postId}/likes`, { brand })
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

