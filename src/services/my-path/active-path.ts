/**
 * @module ActivePath
 */

import { GET, POST } from '../../infrastructure/http/HttpClient'
import { fetchActivePathOnce, invalidateDailySession, setCachedActivePath } from './cache'

const BASE_PATH: string = `/api/content-org`
const LEARNING_PATHS_PATH = `${BASE_PATH}/v1/user/learning-paths`

export interface ActiveLearningPathResponse {
  user_id: number
  brand: string
  active_learning_path_id: number
}

/**
 * Gets user's active learning path.
 * @param brand
 */
export async function getActivePath(brand: string): Promise<ActiveLearningPathResponse | null> {
  const url: string = `${LEARNING_PATHS_PATH}/active-path/get?brand=${brand}`

  return await fetchActivePathOnce(brand, () =>
    GET(url) as Promise<ActiveLearningPathResponse>,
  ) as ActiveLearningPathResponse
}

/**
 * Sets a new learning path as the user's active learning path.
 * @param brand
 * @param learningPathId
 */
export async function startLearningPath(brand: string, learningPathId: number): Promise<ActiveLearningPathResponse | null> {
  const url: string = `${LEARNING_PATHS_PATH}/active-path/set`
  const body = { brand: brand, learning_path_id: learningPathId }

  const response = (await POST(url, body)) as ActiveLearningPathResponse

  if (response) {
    setCachedActivePath(brand, response)
    invalidateDailySession(brand)

    const urlGet: string = `${LEARNING_PATHS_PATH}/active-path/get?brand=${brand}`
    GET(urlGet, { cache: 'reload' }).catch(() => {})
  }

  return response
}
