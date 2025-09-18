/**
 * @module Threads
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import { ForumThread } from './types'

const baseUrl = `/api/forums`

export interface CreateThreadParams {
  name: string
  description: string
  weight: number
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
