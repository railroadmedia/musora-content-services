import { fetchHandler } from '../railcontent.js'
import { fetchByRailContentId, fetchByRailContentIds, fetchMethodV2Structure } from '../sanity.js'
import { addContextToContent } from '../contentAggregator.js'
import { getProgressStateByIds } from '../contentProgress.js'
/**
 * @module GuidedCourses
 */
const BASE_PATH: string = `/api/content-org`

/**
 * Gets today's daily session for the user.
 * @param brand
 * @param userDate
 */
export async function getDailySession(brand: string, userDate: Date) {
  const stringDate = userDate.toISOString().split('T')[0]
  const url: string = `${BASE_PATH}/v1/user/learning-paths/daily-session/get-or-create`
  const body = { brand: brand, userDate: stringDate }
  return await fetchHandler(url, 'POST', null, body)
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
  keepFirstLearningPath: boolean
) {
  const stringDate = userDate.toISOString().split('T')[0]
  const url: string = `${BASE_PATH}/v1/user/learning-paths/daily-session/update`
  const body = { brand: brand, userDate: stringDate, keepFirstLearningPath: keepFirstLearningPath }
  return await fetchHandler(url, 'POST', null, body)
}

/**
 * Gets user's active learning path.
 * @param brand
 */
export async function getActivePath(brand: string) {
  const url: string = `${BASE_PATH}/v1/user/learning-paths/active-path/get-or-create`
  const body = { brand: brand }
  return await fetchHandler(url, 'POST', null, body)
}

/**
 * Updates user's active learning path.
 * @param brand
 */
export async function updateActivePath(brand: string) {
  const url: string = `${BASE_PATH}/v1/user/learning-paths/active-path/update`
  const body = { brand: brand }
  return await fetchHandler(url, 'POST', null, body)
}

/** Fetches and organizes learning path lessons.
 *
 * @param {string} brand
 * @param userDate - format 2025-10-31
 * @param {number} contentId - The content ID for the current video.
 * @param {number} learningPathId - The learning path ID.
 * @returns {Promise<Object>} result - The result object.
 * @returns {number} result.id - The learning path ID.
 * @returns {string} result.type - The type, always 'learning_path'.
 * @returns {string} [result.thumbnail] - Optional thumbnail URL for the learning path.
 * @returns {string} result.title - The title of the learning path.
 * @returns {boolean} result.isActive - Whether the learning path is currently active.
 * @returns {Array} result.lessons - Array of all lessons in the learning path.
 * @returns {Array} [result.completed] - Optional array of completed lessons.
 * @returns {Array} [result.upcoming] - Optional array of upcoming/additional lessons.
 * @returns {Array} [result.nextPath] - Optional array of next lessons to be taken.
 * @returns {Array} [result.today] - Optional array of today's lessons (max 3).
 * @returns {Object} [result.award] - Optional award information.
 * @returns {Array} [result.resources] - Optional array of resources.
 *
 * @example
 * // Fetch learning path lessons
 * fetchLearningPathLessons(12345, 67890)
 *   .then(result => console.log(result))
 *   .catch(error => console.error(error));
 */
export async function fetchLearningPathLessons(
  learningPathId: number,
  brand: string,
  userDate: Date
) {
  const [learningPath, dailySession] = await Promise.all([
    fetchByRailContentId(learningPathId, 'learning-path-v2'),
    getDailySession(brand, userDate),
  ])

  const addContextParameters = {
    addProgressStatus: true,
    addProgressPercentage: true,
  }

  const lessons = await addContextToContent(() => learningPath.lessons, addContextParameters)
  const isActiveLearningPath = (dailySession?.active_learning_path_id || 0) == learningPathId
  const todayContentIds = dailySession.daily_session[0]?.content_ids || []
  const nextContentIds = dailySession.daily_session[1]?.content_ids || []
  const completedLessons = []
  let todaysLessons = []
  let nextLPLessons = []
  const upcomingLessons = []
  const lessonIds = lessons.map((lesson: any) => lesson.id).filter(Boolean)

  lessons.forEach((lesson: any) => {
    if (todayContentIds.includes(lesson.id)) {
      todaysLessons.push(lesson)
    } else if (nextContentIds.includes(lesson.id)) {
      nextLPLessons.push(lesson)
    } else if (lesson.progressStatus === 'completed') {
      completedLessons.push(lesson)
    } else {
      upcomingLessons.push(lesson)
    }
  })

  if (todaysLessons.length == 0 && nextLPLessons.length > 0) {
    // Daily sessions first lessons are not part of the active learning path, but next lessons are
    // load todays lessons from previous learning path
    todaysLessons = await addContextToContent(
      fetchByRailContentIds,
      todayContentIds,
      addContextParameters
    )
  } else if (nextContentIds.length > 0 && nextLPLessons.length == 0 && todaysLessons.length > 0) {
    // Daily sessions first lessons are the active learning path and the next lessons are not
    // load next lessons from next learning path
    nextLPLessons = await addContextToContent(
      fetchByRailContentIds,
      nextContentIds,
      addContextParameters
    )
  }

  return {
    id: learningPathId,
    type: 'learning_path',
    thumbnail: learningPath.thumbnail,
    title: learningPath.title || '',
    is_active_learning_path: isActiveLearningPath,
    upcoming_lessons: upcomingLessons,
    todays_lessons: todaysLessons,
    next_learning_path_lessons: nextLPLessons,
    completed_lessons: completedLessons,
  }
}
