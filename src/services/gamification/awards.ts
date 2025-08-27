/**
 * @module Awards
 */

import { HttpClient } from '../../infrastructure/http/HttpClient'
import { PaginatedResponse } from '../api/types'
import { globalConfig } from '../config'

const baseUrl = `/api/gamification`

export interface Award {
  id: number
  user_id: number
  completed_at: string          // ISO-8601 timestamp
  completion_data: Object
  award_id: number
  type: string
  title: string
  badge: string
}

export interface Certificate {
  id: number
  user_name: string
  user_id: number
  completed_at: string          // ISO-8601 timestamp
  message: string
  award_id: number
  type: string
  title: string
  musora_logo: string
  musora_logo_64: string
  brand_logo: string
  brand_logo_64: string
  ribbon_image: string
  ribbon_image_64: string
  award_image: string
  award_image_64: string

  instructor_signature?: string
  instructor_signature_64?: string
}
/**
 * Get awards for a specific user.
 *
 * NOTE: needs error handling for the response from http client
 * (Alexandre: I'm doing it in a different branch/PR: https://github.com/railroadmedia/musora-content-services/pull/349)
 * NOTE: This function still expects brand because FE passes the argument. It is ignored for now
 *
 * @param {number} userId - The user ID. If not provided, the authenticated user is used instead.
 * @param {string} _brand - The brand to fetch the awards for.
 * @param {number|null} [page=1] - Page attribute for pagination
 * @param {number|null} [limit=5] - Limit how many items to return
 * @returns {Promise<PaginatedResponse<Award>>} - The awards for the user.
 */
export async function fetchAwardsForUser(
  userId: number,
  _brand: string,
  page: number = 1,
  limit: number = 5
): Promise<PaginatedResponse<Award>> {
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  const response = await httpClient.get<PaginatedResponse<Award>>(
    `${baseUrl}/v1/users/${userId}/awards?limit=${limit}&page=${page}`
  )

  return response
}

/**
 * Get certificate data for a completed user award
 *
 * NOTE: needs error handling for the response from http client
 * (Alexandre: I'm doing it in a different branch/PR: https://github.com/railroadmedia/musora-content-services/pull/349)
 * NOTE: This function still expects brand because FE passes the argument. It is ignored for now
 *
 * @param {number} userAwardId - The user award progress id
 * @returns {Promise<Certificate>} - The certificate data for the completed user award.
 */
export async function fetchCertificate(userAwardId: number): Promise<Certificate> {
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  const response = await httpClient.get<Certificate>(
    `${baseUrl}/v1/users/certificate/${userAwardId}`
  )
  return response
}
