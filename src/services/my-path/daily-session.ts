/**
 * @module DailySession
 */

import { GET, POST } from '../../infrastructure/http/HttpClient'
import { fetchDailySessionOnce, formatLocalDateTime, setCachedDailySession } from './cache'

const BASE_PATH: string = `/api/content-org`
const LEARNING_PATHS_PATH = `${BASE_PATH}/v1/user/learning-paths`

export interface DailySessionResponse {
  user_id: number
  brand: string
  user_date: string
  daily_session: DailySession[]
  active_learning_path_id: number
  active_learning_path_created_at: string
}

export interface DailySession {
  content_ids: number[]
  learning_path_id: number
}

/**
 * Gets today's daily session for the user.
 * If the daily session doesn't exist, it will be created.
 * @param brand
 * @param userDate - local datetime. must have date and time - format 2025-10-31T13:45:00
 */
export async function getDailySession(brand: string, userDate: Date): Promise<DailySessionResponse | '' | null> {
  const dateWithTimezone = formatLocalDateTime(userDate)

  try {
    return await fetchDailySessionOnce(brand, userDate, async () => {
      const url = `${LEARNING_PATHS_PATH}/daily-session/get?brand=${brand}&userDate=${encodeURIComponent(dateWithTimezone)}`

      const response = await GET(url)

      if (!response) {
        return (await updateDailySession(brand, userDate, false)) as DailySessionResponse | ''
      }
      return response
    })
  } catch (error) {
    console.error('Error fetching daily session:', (error as any).message)
    return null
  }
}

/**
 * Updates the daily session for the user. Optionally, keeps the first learning path's dailies from a matching day's session.
 * @param brand
 * @param userDate - format 2025-10-31
 * @param keepFirstLearningPath
 */
export async function updateDailySession(
  brand: string,
  userDate: Date,
  keepFirstLearningPath: boolean = false,
): Promise<DailySessionResponse | null> {
  const dateWithTimezone = formatLocalDateTime(userDate)
  const url: string = `${LEARNING_PATHS_PATH}/daily-session/create`
  const body = {
    brand: brand,
    userDate: dateWithTimezone,
    keepFirstLearningPath: keepFirstLearningPath,
  }
  try {
    const response = (await POST(url, body)) as DailySessionResponse | ''
    setCachedDailySession(brand, userDate, response !== '' ? response : null)

    const urlGet: string = `${LEARNING_PATHS_PATH}/daily-session/get?brand=${brand}&userDate=${encodeURIComponent(dateWithTimezone)}`
    GET(urlGet, { cache: 'reload' }).catch(() => {})

    return response !== '' ? response : null
  } catch (error: any) {
    return null
  }
}
