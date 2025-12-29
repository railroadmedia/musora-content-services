/**
 * @module Forums
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import { ForumCategory, ForumThread } from './types'
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
  category_id?: number
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
 * @param {number} threadId - The ID of the thread to follow.
 * @param {string} brand - The brand associated with the follow action.
 * @return {Promise<void>} - A promise that resolves when the thread is followed.
 * @throws {HttpError} - If the request fails.
 */
export async function followThread(threadId: number, brand: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.put<void>(`${baseUrl}/v1/threads/${threadId}/follow`, { brand })
}

/**
 * Unfollow a thread to allow further posts.
 *
 * @param {number} threadId - The ID of the thread to unfollow.
 * @param {string} brand - The brand associated with the unfollow action.
 * @return {Promise<void>} - A promise that resolves when the thread is unfollowed.
 * @throws {HttpError} - If the request fails.
 */
export async function unfollowThread(threadId: number, brand: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.delete<void>(`${baseUrl}/v1/threads/${threadId}/follow?brand=${brand}`)
}

/**
 * Marks a thread as read for the authenticated user.
 *
 * @param {number} threadId - The ID of the thread to mark as read.
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @return {Promise<void>} - A promise that resolves when the thread is marked as read.
 * @throws {HttpError} - If the request fails.
 */
export async function markThreadAsRead(threadId: number, brand: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.put<void>(`${baseUrl}/v1/threads/${threadId}/read?brand=${brand}`, {})
}

/**
 * Fetches a single forum thread by ID.
 *
 * @param {number} threadId - The ID of the thread to fetch.
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @returns {Promise<ForumThread>} - A promise that resolves to the forum thread.
 * @throws {HttpError} - If the HTTP request fails.
 */
export async function fetchThread(threadId: number, brand: string): Promise<ForumThread> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<ForumThread>(`${baseUrl}/v1/threads/${threadId}?brand=${brand}`)
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

/**
 * Pins a thread to the top of its category.
 *
 * @param {number} threadId - The ID of the thread to pin.
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @return {Promise<void>} - A promise that resolves when the thread is pinned.
 * @throws {HttpError} - If the request fails.
 */
export async function pinThread(threadId: number, brand: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<void>(`${baseUrl}/v1/threads/${threadId}/pin`, { brand })
}

/**
 * Unpins a thread from the top of its category.
 *
 * @param {number} threadId - The ID of the thread to unpin.
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @return {Promise<void>} - A promise that resolves when the thread is unpinned.
 * @throws {HttpError} - If the request fails.
 */
export async function unpinThread(threadId: number, brand: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.delete<void>(`${baseUrl}/v1/threads/${threadId}/pin?brand=${brand}`)
}

/**
 * Locks a thread to prevent further posts.
 *
 * @param {number} threadId - The ID of the thread to lock.
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @return {Promise<void>} - A promise that resolves when the thread is locked.
 * @throws {HttpError} - If the request fails.
 */
export async function lockThread(threadId: number, brand: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<void>(`${baseUrl}/v1/threads/${threadId}/lock`, { brand })
}

/**
 * Unlock a thread to allow further posts.
 *
 * @param {number} threadId - The ID of the thread to unlock.
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @return {Promise<void>} - A promise that resolves when the thread is unlocked.
 * @throws {HttpError} - If the request fails.
 */
export async function unlockThread(threadId: number, brand: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.delete<void>(`${baseUrl}/v1/threads/${threadId}/lock?brand=${brand}`)
}

/**
 * Fetches followed forum Threads for the given brand and current user.
 *
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @returns {Promise<PaginatedResponse<ForumThread>>} - A promise that resolves to the list of forum threads.
 * @throws {HttpError} - If the request fails.
 */
export async function fetchFollowedThreads(
  brand: string
): Promise<PaginatedResponse<ForumThread>> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<PaginatedResponse<ForumThread>>(`${baseUrl}/v1/threads?brand=${brand}`)
}

/**
 * Fetches latest forum Threads for the given brand and not blocked to current user.
 *
 * @param {string} brand - The brand context (e.g., "drumeo", "singeo").
 * @returns {Promise<PaginatedResponse<ForumThread>>} - A promise that resolves to the list of forum threads.
 * @throws {HttpError} - If the request fails.
 */
export async function fetchLatestThreads(
  brand: string
): Promise<PaginatedResponse<ForumThread>> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<PaginatedResponse<ForumThread>>(`${baseUrl}/v1/threads/latest?brand=${brand}`)
}

/**
 * Delete a thread.
 *
 * @param {number} threadId - The ID of the thread.
 * @param {string} brand - The brand associated with the delete action.
 * @return {Promise<void>} - A promise that resolves when the thread is deleted.
 * @throws {HttpError} - If the request fails.
 */
export async function deleteThread(threadId: number, brand: string): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.delete<void>(`${baseUrl}/v1/threads/${threadId}?brand=${brand}`)
}
