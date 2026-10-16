/**
 * @module MyPathDailySession
 */

import { GET, POST } from '../../infrastructure/http/HttpClient'
import {
  fetchDailySessionOnce,
  formatLocalDate,
  setCachedActivePath,
  setCachedDailySession,
} from './cache'
import type { ActivePathResponse } from './active-path'

const DAILY_SESSION_PATH = `/api/my-path/v2/daily-session`

function dailySessionUrl(brand: string, userDate: Date): string {
  return `${DAILY_SESSION_PATH}?brand=${brand}&user_date=${encodeURIComponent(formatLocalDate(userDate))}`
}

function dailySessionBody(brand: string, userDate: Date, replacePlaceholdersOnly: boolean): object {
  return {
    brand: brand,
    user_date: formatLocalDate(userDate),
    replace_placeholders_only: replacePlaceholdersOnly,
  }
}

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

export async function fetchDailySession(brand: string, userDate: Date): Promise<DailySessionResponse | null> {
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

export async function createDailySession(
  brand: string,
  userDate: Date,
  replacePlaceholdersOnly: boolean = false,
): Promise<DailySessionResponse | null> {
  const body = dailySessionBody(brand, userDate, replacePlaceholdersOnly)
  const response = (await POST(DAILY_SESSION_PATH, body)) as DailySessionResponse | ''
  if (!response) return null

  setCachedActivePath(brand, response)
  setCachedDailySession(brand, userDate, response)

  return response
}
