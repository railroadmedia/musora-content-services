import { fetchHandler } from '../railcontent.js'

/**
 * @module GuidedCourses
 */
const BASE_PATH: string = `/api/content-org`

/**
 * Gets today's daily session for the user.
 * @param brand
 * @param userDate
 */
export async function getDailySession(brand: string, userDate: string) {
  const url: string = `${BASE_PATH}/v1/user/learning-paths/daily-session/get-or-create`
  const body = { brand: brand, userDate: userDate }
  return await fetchHandler(url, 'POST', null, body)
}

/**
 * Updates the daily session for the user. Optionally, keeps the first learning path's dailies from a matching day's session.
 * @param brand
 * @param userDate
 * @param keepFirstLearningPath
 */
export async function updateDailySession(brand: string, userDate: string, keepFirstLearningPath: boolean) {
  const url: string = `${BASE_PATH}/v1/user/learning-paths/daily-session/update`
  const body = { brand: brand, userDate: userDate, keepFirstLearningPath: keepFirstLearningPath }
  return await fetchHandler(url, 'POST', null, body)
}
