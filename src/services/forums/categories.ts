/**
 * @module Forums
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { globalConfig } from '../config.js'
import { ForumCategory } from './types'

const baseUrl = `/api/forums`

/**
 * Fetches forum categories for the given brand.
 *
 * @param {string|null} brand - The brand context (e.g., "drumeo", "singeo").
 * @returns {Promise<ForumCategory>} - A promise that resolves to the list of forum categories.
 * @throws {HttpError} - If the request fails.
 */
export async function fetchForumCategories(brand: string): Promise<ForumCategory> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.get<ForumCategory>(`${baseUrl}/v1/categories?brand=${brand}`)
}

export interface CreateForumCategoryParams {
  title: string
  description: string
  weight: number
  brand: string
  icon?: string
}

/**
 * Creates a new forum category.
 *
 * @param {CreateForumCategoryParams} params - The parameters for creating the forum category.
 * @returns {Promise<ForumCategory>} - A promise that resolves to the created forum category.
 * @throws {HttpError} - If the request fails.
 */
export async function createForumCategory(
  params: CreateForumCategoryParams
): Promise<ForumCategory> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post<ForumCategory>(`${baseUrl}/v1/categories`, params)
}

export interface UpdateForumCategoryParams {
  id: number
  brand: string
  title: string
  weight: number
  description?: string
  icon?: string
}

/**
 * Creates a new forum category.
 *
 * @param {UpdateForumCategoryParams} params - The parameters for creating the forum category.
 * @returns {Promise<ForumCategory>} - A promise that resolves to the created forum category.
 * @throws {HttpError} - If the request fails.
 */
export async function updateForumCategory(
  params: UpdateForumCategoryParams
): Promise<ForumCategory> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.put<ForumCategory>(`${baseUrl}/v1/categories/${params.id}`, params)
}

export interface DeleteForumCategoryParams {
  id: number
  brand: string
}

/**
 * Deletes a forum category.
 *
 * @param {DeleteForumCategoryParams} params - The parameters for deleting the forum category.
 * @returns {Promise<void>} - A promise that resolves when the category is deleted.
 * @throws {HttpError} - If the request fails.
 */
export async function deleteForumCategory(
  params: DeleteForumCategoryParams
): Promise<void> {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.delete<void>(`${baseUrl}/v1/categories/${params.id}?brand=${params.brand}`)
}
