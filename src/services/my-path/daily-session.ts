/**
 * @module MyPathDailySession
 */

import { GET, POST } from '../../infrastructure/http/HttpClient'
import {
  fetchDailySessionOnce,
  formatLocalDateTime,
  setCachedActivePath,
  setCachedDailySession,
} from './cache'
import type { ActivePathResponse } from './active-path'

const excludeFromGeneratedIndex = ['reloadDailySessionHttpCache']

const DAILY_SESSION_PATH = `/api/my-path/v2/daily-session`

export interface DailySessionGroup {
  content_ids: number[]
  learning_path_id: number
  node_id: string
  is_placeholder: boolean
}

export interface DailySessionResponse extends ActivePathResponse {
  daily_session: DailySessionGroup[]
  user_date: string
}

function dailySessionUrl(brand: string, userDate: Date): string {
  return `${DAILY_SESSION_PATH}?brand=${brand}&userDate=${encodeURIComponent(formatLocalDateTime(userDate))}`
}

export function reloadDailySessionHttpCache(brand: string, userDate: Date): void {
  GET(dailySessionUrl(brand, userDate), { cache: 'reload' }).catch(() => {})
}

/**
 * Gets the daily session for the user's active path, creating it if none exists for that day.
 * @param brand
 * @param userDate - local date with offset, e.g. 2025-10-31 -05:00
 */
export async function myPathGetDailySession(brand: string, userDate: Date): Promise<DailySessionResponse | null> {
  try {
    const response = await fetchDailySessionOnce<DailySessionResponse>(brand, userDate, async () => {
      const existing = (await GET(dailySessionUrl(brand, userDate))) as DailySessionResponse | ''
      return existing || (await createDailySession(brand, userDate)) || ''
    })
    return response || null
  } catch (error) {
    console.error('Error fetching daily session:', (error as any).message)
    return null
  }
}

/**
 * @param brand
 * @param userDate - local date with offset, e.g. 2025-10-31 -05:00
 * @param replacePlaceholdersOnly - keep the existing non-placeholder groups and only refill placeholder ones
 * @returns null when the user has no active path
 */
export async function createDailySession(
  brand: string,
  userDate: Date,
  replacePlaceholdersOnly: boolean = false,
): Promise<DailySessionResponse | null> {
  const body = {
    brand,
    userDate: formatLocalDateTime(userDate),
    replacePlaceholdersOnly,
  }

  const response = (await POST(DAILY_SESSION_PATH, body)) as DailySessionResponse | ''
  if (!response) return null

  setCachedActivePath(brand, response)
  setCachedDailySession(brand, userDate, response)
  reloadDailySessionHttpCache(brand, userDate)

  return response
}
