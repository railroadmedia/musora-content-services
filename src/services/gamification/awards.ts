/**
 * @module Awards
 */

import { HttpClient } from '../../infrastructure/http/HttpClient'
import { PaginatedResponse } from '../api/types'
import { globalConfig } from '../config'

const baseUrl = `/api/user-management-system`

export interface Award {
  username: string
  date_completed: Date
  challenge_title: string
  award_text: string
  tier: string
  award: string
  instructor_signature?: string
  musora_logo: string
  brand_logo: string
  ribbon_image: string
  award_64: string
  instructor_signature_64: string
  musora_logo_64: string
  brand_logo_64: string
  ribbon_image_64: string
  id: number
  title: string
  badge: string
  artist_name: string
  dark_mode_logo_url: string
  light_mode_logo_url: string
  logo_image_url: string
  web_url_path: string
}
/**
 * Get awards for a specific user.
 *
 * NOTE: needs error handling for the response from http client (Alexandre: I'm doing it in a different branch/PR)
 * NOTE: This function still expects brand because FE passes the argument. It is ignored for now
 *
 * @param {number|null} userId - The user ID. If not provided, the authenticated user is used instead.
 * @param {string} _brand - The brand to fetch the awards for.
 * @param {number|null} page - Page attribute for pagination
 * @param {number|null} limit - Limit how many items to return
 * @returns {Promise<PaginatedResponse<Award>>} - The awards for the user.
 */
export async function fetchAwardsForUser(
  userId: number,
  _brand: string,
  page: number = 1,
  limit: number = 5
): Promise<PaginatedResponse<Award[]>> {
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  const response = await httpClient.get<PaginatedResponse<Award[]>>(
    `${baseUrl}/v1/users/${userId}/awards?limit=${limit}&page=${page}`
  )

  return response
}
