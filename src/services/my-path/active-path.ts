/**
 * @module MyPathActivePath
 */

import { GET, POST, PUT } from '../../infrastructure/http/HttpClient'
import { fetchActivePathOnce, formatLocalDate, setCachedActivePath, setCachedDailySession } from './cache'
import type { DailySessionResponse } from './daily-session'

const ACTIVE_PATH_PATH = `/api/my-path/v2/active-path`

function activePathUrl(brand: string): string {
  return `${ACTIVE_PATH_PATH}?brand=${brand}`
}

function activePathBody(brand: string, userDate: Date, learningPathId?: number, nodeId?: string): object {
  return {
    brand: brand,
    user_date: formatLocalDate(userDate),
    learning_path_id: learningPathId,
    node_id: nodeId,
  }
}

export interface ActivePathResponse {
  user_id: number
  brand: string
  active_learning_path_id: number
  active_node_id: string
  active_learning_path_created_at: number
}

function cacheActivePathAndDailySession(brand: string, userDate: Date, response: DailySessionResponse): void {
  setCachedActivePath(brand, response)
  setCachedDailySession(brand, userDate, response)
}

export async function getMyPathActivePath(brand: string): Promise<ActivePathResponse | null> {
  const response = await fetchActivePathOnce<ActivePathResponse>(brand, () =>
    GET(activePathUrl(brand)) as Promise<ActivePathResponse | ''>,
  )
  return response || null
}

export async function setActiveLearningPath(
  brand: string,
  learningPathId: number,
  nodeId: string,
  userDate: Date,
): Promise<DailySessionResponse> {
  const body = activePathBody(brand, userDate, learningPathId, nodeId)
  const response = (await POST(ACTIVE_PATH_PATH, body)) as DailySessionResponse
  cacheActivePathAndDailySession(brand, userDate, response)

  return response
}

export async function advanceActiveLearningPath(brand: string, userDate: Date): Promise<DailySessionResponse> {
  const body = activePathBody(brand, userDate)
  const response = (await POST(`${ACTIVE_PATH_PATH}/advance`, body)) as DailySessionResponse
  cacheActivePathAndDailySession(brand, userDate, response)

  return response
}
