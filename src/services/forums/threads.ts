/**
 * @module Forums
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import { ForumThread } from './types'
import { PaginatedResponse } from '../api/types'

const baseUrl = `/api/forums`

export interface CreateThreadParams {
  title: string
  first_post_content: string
  brand: string
}

/**
 * Creates a new thread under a forum category.
 *
 * @param {CreateThreadParams} params - The parameters for creating the thread.
 * @returns {Promise<ForumThread>} - A promise that resolves to the created thread.
 * @throws {HttpError} - If the request fails.
 */
export async function createThread(
  categoryId: number,
  params: CreateThreadParams
): Promise<ForumThread> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<ForumThread>(`${baseUrl}/v1/categories/${categoryId}/threads`, params)
}

export interface UpdateThreadParams {
  title: string
  brand: string
}
/**
 * Updates an existing thread under a forum category.
 *
 * @param {number} threadId - The ID of the thread to update.
 * @param {UpdateThreadParams} params - The parameters for updating the thread.
 * @returns {Promise<ForumThread>} - A promise that resolves to the updated thread.
 * @throws {HttpError} - If the request fails.
 */
export async function updateThread(
  threadId: number,
  params: UpdateThreadParams
): Promise<ForumThread> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.put<ForumThread>(`${baseUrl}/v1/threads/${threadId}`, params)
}

/**
 * Follow a thread.
 *
 * @param {number} threadId - The ID of the thread to lock.
 * @param {string} brand - The brand associated with the follow action.
 * @return {Promise<void>} - A promise that resolves when the thread is locked.
 * @throws {HttpError} - If the request fails.
 */
export async function followThread(threadId: number, brand: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<void>(`${baseUrl}/v1/threads/${threadId}/follow`, { brand })
}

/**
 * Unlock a thread to allow further posts.
 *
 * @param {number} threadId - The ID of the thread to unlock.
 * @param {string} brand - The brand associated with the unlock action.
 * @return {Promise<void>} - A promise that resolves when the thread is unlocked.
 * @throws {HttpError} - If the request fails.
 */
export async function unfollowThread(threadId: number, brand: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.delete<void>(`${baseUrl}/v1/threads/${threadId}/follow?brand=${brand}`)
}

export interface FetchThreadParams {
  is_followed?: boolean,
  page?: number,
  limit?: number,
  sort?: '-last_post_published_on' | string
}
/**
 * Fetches forum threads for the given category.
 *
 * @param {number} categoryId - The ID of the forum category.
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @param {FetchThreadParams} params - Optional additional parameters (e.g., is_followed, sort("last_post_published_on","-last_post_published_on","mine")).
 * @returns {Promise<PaginatedResponse<ForumThread>>} - A promise that resolves to a paginated list of forum threads.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function fetchThreads(
  categoryId: number,
  brand: string,
  params: FetchThreadParams = {}
): Promise<PaginatedResponse<ForumThread>> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const queryObj: Record<string, string> = { brand, ...Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)])
    )}
  const query = new URLSearchParams(queryObj).toString()

  const url = `${baseUrl}/v1/categories/${categoryId}/threads?${query}`
  return httpClient.get<PaginatedResponse<ForumThread>>(url)
}

