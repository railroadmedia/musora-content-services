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
