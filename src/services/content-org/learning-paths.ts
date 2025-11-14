/**
 * @module LearningPaths
 */

import { fetchHandler } from '../railcontent.js'
import { fetchByRailContentId, fetchByRailContentIds, fetchMethodV2Structure } from '../sanity.js'
import { addContextToContent } from '../contentAggregator.js'
import {
  contentStatusCompleted,
  contentStatusReset,
  getProgressState,
  getProgressStateByIds
} from '../contentProgress.js'

const BASE_PATH: string = `/api/content-org`
const LEARNING_PATHS_PATH = `${BASE_PATH}/v1/user/learning-paths`

/**
 * Gets today's daily session for the user.
 * @param brand
 * @param userDate
 */
export async function getDailySession(brand: string, userDate: Date) {
  const stringDate = userDate.toISOString().split('T')[0]
  const url: string = `${LEARNING_PATHS_PATH}/daily-session/get-or-create`
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
  const url: string = `${LEARNING_PATHS_PATH}/daily-session/update`
  const body = { brand: brand, userDate: stringDate, keepFirstLearningPath: keepFirstLearningPath }
  return await fetchHandler(url, 'POST', null, body)
}

/**
 * Gets user's active learning path.
 * @param brand
 */
export async function getActivePath(brand: string) {
  const url: string = `${LEARNING_PATHS_PATH}/active-path/get-or-create`
  const body = { brand: brand }
  return await fetchHandler(url, 'POST', null, body)
}

// todo this should be removed once we handle active path gen only through
//  finish method intro or complete current active path
/**
 * Updates user's active learning path.
 * @param brand
 */
export async function updateActivePath(brand: string) {
  const url: string = `${LEARNING_PATHS_PATH}/active-path/update`
  const body = { brand: brand }
  return await fetchHandler(url, 'POST', null, body)
}

/**
 * Starts a new learning path for the user.
 * @param brand
 * @param learningPathId
 */
export async function startLearningPath(brand: string, learningPathId: number) {
  const url: string = `${LEARNING_PATHS_PATH}/start`
  const body = { brand: brand, learning_path_id: learningPathId }
  return await fetchHandler(url, 'POST', null, body)
}

/**
 * Resets the user's learning path.
 */
export async function resetAllLearningPaths() {
  const url: string = `${LEARNING_PATHS_PATH}/reset`
  return await fetchHandler(url, 'POST', null, {})
}

/**
 * Returns learning path with lessons and progress data
 * @param {number} learningPathId - The learning path ID
 * @returns {Promise<Object>} Learning path with enriched lesson data
 */
export async function getEnrichedLearningPath(learningPathId) {
  //TODO BEH-1410: refactor/cleanup
  let learningPath = await fetchByRailContentId(learningPathId, 'learning-path-v2')
  learningPath.children = mapContentToParent(
    learningPath.children,
    'learning-path-lesson-v2',
    learningPathId
  )

  learningPath.children = await addContextToContent(() => learningPath.children, {
    addProgressStatus: true,
    addProgressPercentage: true,
    addProgressTimestamp: true,
  })
  learningPath = await addContextToContent(() => learningPath, { addNextLesson: true })
  return learningPath
}

/**
 * Get specific learning path lessons by content IDs
 * @param {number[]} contentIds - Array of content IDs to filter
 * @param {number} learningPathId - The learning path ID
 * @returns {Promise<Array>} Filtered lessons
 */
export async function getLearningPathLessonsByIds(contentIds, learningPathId) {
  // It is more efficient to load the entire learning path than individual lessons
  // Also adds reliability check whether content is actually in the learning path
  const learningPath = await getEnrichedLearningPath(learningPathId)
  return learningPath.children.filter((lesson) => contentIds.includes(lesson.id))
}

/**
 * Maps content to its parent learning path - fixes multi-parent problems for cta when lessons have a special collection.
 * @param lessons
 * @param parentContentType
 * @param parentContentId
 */
export function mapContentToParent(lessons, parentContentType, parentContentId) {
  return lessons.map((lesson: any) => {
    return { ...lesson, type: parentContentType, parent_id: parentContentId }
  })
}

/** Fetches and organizes learning path lessons.
 *
 * @param {number} learningPathId - The learning path ID.
 * @param {string} brand
 * @param {Date} userDate - Users local date - format 2025-10-31
 * @returns {Promise<Object>} result - The result object.
 * @returns {number} result.id - The learning path ID.
 * @returns {string} result.thumbnail - Optional thumbnail URL for the learning path.
 * @returns {string} result.title - The title of the learning path.
 * @returns {boolean} result.is_active_learning_path - Whether the learning path is currently active.
 * @returns {Array} result.children - Array of all lessons.
 * @returns {Array} result.upcoming_lessons - Array of upcoming/additional lessons.
 * @returns {Array} result.todays_lessons - Array of today's lessons (max 3).
 * @returns {Array} result.next_learning_path_lessons - Array of next lessons to be taken.
 * @returns {Array} result.completed_lessons - Array of completed lessons.
 * @returns {Array} result.previous_learning_path_todays - Array of completed lessons.
 */
export async function fetchLearningPathLessons(
  learningPathId: number,
  brand: string,
  userDate: Date
) {
  const [learningPath, dailySession] = await Promise.all([
    getEnrichedLearningPath(learningPathId),
    getDailySession(brand, userDate),
  ])

  const isActiveLearningPath = (dailySession?.active_learning_path_id || 0) == learningPathId
  if (!isActiveLearningPath) {
    return {
      ...learningPath,
      is_active_learning_path: isActiveLearningPath,
    }
  }
  const todayContentIds = dailySession.daily_session[0]?.content_ids || []
  const previousLearningPathId = dailySession.daily_session[0]?.learning_path_id
  const nextContentIds = dailySession.daily_session[1]?.content_ids || []
  const nextLearningPathId = dailySession.daily_session[1]?.learning_path_id
  const completedLessons = []
  let todaysLessons = []
  let nextLPLessons = []
  let previousLearningPathTodays = []
  const upcomingLessons = []

  learningPath.children.forEach((lesson: any) => {
    if (todayContentIds.includes(lesson.id)) {
      todaysLessons.push(lesson)
    } else if (lesson.progressStatus === 'completed') {
      completedLessons.push(lesson)
    } else {
      upcomingLessons.push(lesson)
    }
  })

  if (todaysLessons.length == 0) {
    // Daily sessions first lessons are not part of the active learning path, but next lessons are
    // load todays lessons from previous learning path
    previousLearningPathTodays = await getLearningPathLessonsByIds(
      todayContentIds,
      previousLearningPathId
    )
  } else if (
    nextContentIds.length > 0 &&
    todaysLessons.length < 3 &&
    upcomingLessons.length === 0
  ) {
    // Daily sessions first lessons are the active learning path and the next lessons are not
    // load next lessons from next learning path
    nextLPLessons = await getLearningPathLessonsByIds(nextContentIds, nextLearningPathId)
  }

  return {
    ...learningPath,
    is_active_learning_path: isActiveLearningPath,
    active_learning_path_id: dailySession?.active_learning_path_id,
    active_learning_path_created_at: dailySession?.active_learning_path_created_at,
    upcoming_lessons: upcomingLessons,
    todays_lessons: todaysLessons,
    next_learning_path_lessons: nextLPLessons,
    completed_lessons: completedLessons,
    previous_learning_path_todays: previousLearningPathTodays,
  }
}

/**
 * Handles completion of method intro video and other related actions.
 * @param introVideoId
 * @param brand
 */
export async function completeMethodIntroVideo(introVideoId: number, brand: string) {
  let response = []

  response["intro_video_response"] = await completeIfNotCompleted(introVideoId)

  const url: string = `${LEARNING_PATHS_PATH}/start`
  const body = { brand: brand }
  response["active_path_response"] = await fetchHandler(url, 'POST', null, body)

  return response
}

/**
 * Handles completion of learning path intro video and other related actions.
 * @param introVideoId
 * @param learningPathId
 * @param lessonsToImport
 */
export async function completeLearningPathIntroVideo(introVideoId: number, learningPathId: number, lessonsToImport: number[] | null) {
  let response = []

  response["intro_video_response"] = await completeIfNotCompleted(introVideoId)

  console.log('lessons', lessonsToImport)
  if (!lessonsToImport) {
    // reset progress within the learning path
    response["learning_path_reset_response"] = await contentStatusReset(learningPathId)
  } else {
    response["learning_path_reset_response"] = []
    // todo: import progress into teh LP from external sources.

    // todo: add collection context + optimize with bulk calls with watermelon
    for (const contentId of lessonsToImport) {
      response["learning_path_reset_response"][contentId] = await contentStatusCompleted(contentId)
    }
  }

  return response
}


async function completeIfNotCompleted(contentId: number) {
  const introVideoStatus = await getProgressState(contentId)

  if (introVideoStatus !== 'completed') {
    return await contentStatusCompleted(contentId)
  }
  else return null
}
