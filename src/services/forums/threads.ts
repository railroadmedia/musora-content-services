/**
 * @module Threads
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import { ForumThread } from './types'

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
