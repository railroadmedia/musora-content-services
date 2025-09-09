/**
 * @module ForumCategories
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { HttpError } from '../../infrastructure/http/interfaces/HttpError'
import { globalConfig } from '../config.js'
import { ForumCategory } from './types'

const baseUrl = `/api/forums`

/**
 * Fetches forum categories for the given brand.
 *
 * @param {string|null} brand - The brand context (e.g., "drumeo", "singeo").
 * @returns {Promise<ForumCategory|HttpError>} - A promise that resolves to the list of forum categories or HttpError.
 */
export async function fetchForumCategories(brand: string): Promise<ForumCategory | HttpError> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<ForumCategory>(`${baseUrl}/v1/categories?brand=${brand}`)
}
