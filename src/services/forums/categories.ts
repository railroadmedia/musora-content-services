/**
 * @module ForumCategories
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import { ForumCategory } from './types'

const baseUrl = `/api/forums`

/**
 * Fetches forum categories for the given brand.
 *
 * @param {string|null} brand - The brand context (e.g., "drumeo", "singeo").
 * @returns {Promise<ForumCategory>} - A promise that resolves to the list of forum categories or HttpError.
 * @throws {HttpError} - If the request fails.
 */
export async function fetchForumCategories(brand: string): Promise<ForumCategory> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<ForumCategory>(`${baseUrl}/v1/categories?brand=${brand}`)
}
