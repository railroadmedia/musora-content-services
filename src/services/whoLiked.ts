/**
 * @module WhoLiked
 */
import { HttpClient } from '../infrastructure/http/HttpClient'
import { globalConfig } from './config.js'
import { Liker, WhoLikedParams, WhoLikedResponse } from './forums/types'

export type { Liker, WhoLikedParams, WhoLikedResponse }

const baseUrl = `/api/content/v1`

/**
 * Fetch the list of users who liked a lesson comment.
 *
 * @param {number} commentId - The ID of the comment.
 * @param {WhoLikedParams} [params] - Optional pagination parameters.
 * @returns {Promise<WhoLikedResponse>} - Paginated list of likers.
 * @throws {HttpError} - If the request fails.
 */
export async function whoLikedComment(
  commentId: number,
  params: WhoLikedParams = {}
): Promise<WhoLikedResponse> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries({ page: 1, limit: 20, ...params }).map(([k, v]) => [k, String(v)])
    )
  ).toString()
  return httpClient.get<WhoLikedResponse>(`${baseUrl}/comments/${commentId}/likes?${query}`)
}

/**
 * Fetch the list of users who liked a content item (lesson, song, etc.).
 *
 * @param {number} contentId - The ID of the content item.
 * @param {WhoLikedParams} [params] - Optional pagination parameters.
 * @returns {Promise<WhoLikedResponse>} - Paginated list of likers.
 * @throws {HttpError} - If the request fails.
 */
export async function whoLikedContent(
  contentId: number,
  params: WhoLikedParams = {}
): Promise<WhoLikedResponse> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries({ page: 1, limit: 20, ...params }).map(([k, v]) => [k, String(v)])
    )
  ).toString()
  return httpClient.get<WhoLikedResponse>(`${baseUrl}/content/${contentId}/likes?${query}`)
}
