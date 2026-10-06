/**
 * @module MyPathActivePath
 */

import { GET, POST, PUT } from '../../infrastructure/http/HttpClient'
import { fetchActivePathOnce, formatLocalDateTime, setCachedActivePath, setCachedDailySession } from './cache'
import { reloadDailySessionHttpCache } from './daily-session'
import type { DailySessionResponse } from './daily-session'

const ACTIVE_PATH_PATH = `/api/my-path/v2/active-path`

export interface ActivePathResponse {
  user_id: number
  brand: string
  active_learning_path_id: number
  active_node_id: string
  active_learning_path_created_at: number
}

function activePathUrl(brand: string): string {
  return `${ACTIVE_PATH_PATH}?brand=${brand}`
}

function cacheActivePathAndDailySession(brand: string, userDate: Date, response: DailySessionResponse): void {
  setCachedActivePath(brand, response)
  setCachedDailySession(brand, userDate, response)
  GET(activePathUrl(brand), { cache: 'reload' }).catch(() => {})
  reloadDailySessionHttpCache(brand, userDate)
}

/**
 * @param brand
 * @returns null when the user has no active path
 */
export async function myPathGetActivePath(brand: string): Promise<ActivePathResponse | null> {
  const response = await fetchActivePathOnce<ActivePathResponse>(brand, () =>
    GET(activePathUrl(brand)) as Promise<ActivePathResponse | ''>,
  )
  return response || null
}

/**
 * Sets the active path and creates the daily session for it.
 * @param brand
 * @param learningPathId
 * @param nodeId - the My Path node the learning path belongs to
 * @param userDate - local date with offset, e.g. 2025-10-31 -05:00
 */
export async function setActiveLearningPath(
  brand: string,
  learningPathId: number,
  nodeId: string,
  userDate: Date,
): Promise<DailySessionResponse> {
  const body = {
    brand,
    learning_path_id: learningPathId,
    node_id: nodeId,
    userDate: formatLocalDateTime(userDate),
  }

  const response = (await PUT(ACTIVE_PATH_PATH, body)) as DailySessionResponse
  cacheActivePathAndDailySession(brand, userDate, response)

  return response
}

/**
 * Moves the user to the next learning path and refills the placeholder groups of the daily session.
 * @param brand
 * @param userDate - local date with offset, e.g. 2025-10-31 -05:00
 */
export async function advanceActiveLearningPath(brand: string, userDate: Date): Promise<DailySessionResponse> {
  const body = {
    brand,
    userDate: formatLocalDateTime(userDate),
  }

  const response = (await POST(`${ACTIVE_PATH_PATH}/advance`, body)) as DailySessionResponse
  cacheActivePathAndDailySession(brand, userDate, response)

  return response
}
