/**
 * @module LearningPaths
 */

import { fetchHandler } from '../railcontent.js'
import { fetchByRailContentId, fetchByRailContentIds, fetchMethodV2Structure } from '../sanity.js'
import { addContextToLearningPaths } from '../contentAggregator.js'
import {
  contentStatusCompleted,
  contentsStatusCompleted,
  contentStatusReset,
  getAllCompletedByIds,
  getProgressState,
} from '../contentProgress.js'
import { COLLECTION_TYPE, STATE } from '../sync/models/ContentProgress'
import { SyncWriteDTO } from '../sync'
import { ContentProgress } from '../sync/models'
import { CollectionParameter } from '../sync/repositories/content-progress'

const BASE_PATH: string = `/api/content-org`
const LEARNING_PATHS_PATH = `${BASE_PATH}/v1/user/learning-paths`

interface ActiveLearningPathResponse {
  user_id: number
  brand: string
  active_learning_path_id: number
}

interface DailySessionResponse {
  user_id: number
  brand: string
  user_date: string
  daily_session: DailySession[]
  active_learning_path_id: number
  active_learning_path_created_at: string
}

interface DailySession {
  content_ids: number[]
  learning_path_id: number
}

interface CollectionObject {
  id: number
  type: COLLECTION_TYPE.LEARNING_PATH
}

/**
 * Gets today's daily session for the user.
 * @param brand
 * @param userDate
 */
export async function getDailySession(brand: string, userDate: Date) {
  const stringDate = userDate.toISOString().split('T')[0]
  const url: string = `${LEARNING_PATHS_PATH}/daily-session/get?brand=${brand}&userDate=${stringDate}`
  return (await fetchHandler(url, 'GET', null, null)) as DailySessionResponse
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
  const url: string = `${LEARNING_PATHS_PATH}/daily-session/create`
  const body = { brand: brand, userDate: stringDate, keepFirstLearningPath: keepFirstLearningPath }
  return (await fetchHandler(url, 'POST', null, body)) as DailySessionResponse
}

/**
 * Gets user's active learning path.
 * @param brand
 */
export async function getActivePath(brand: string) {
  const url: string = `${LEARNING_PATHS_PATH}/active-path/get?brand=${brand}`
  return (await fetchHandler(url, 'GET', null, null)) as ActiveLearningPathResponse
}

/**
 * Sets a new learning path as the user's active learning path.
 * @param brand
 * @param learningPathId
 */
export async function startLearningPath(brand: string, learningPathId: number) {
  const url: string = `${LEARNING_PATHS_PATH}/active-path/set`
  const body = { brand: brand, learning_path_id: learningPathId }
  return (await fetchHandler(url, 'POST', null, body)) as ActiveLearningPathResponse
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
  const response = (await addContextToLearningPaths(
    fetchByRailContentId,
    learningPathId,
    COLLECTION_TYPE.LEARNING_PATH,
    {
      dataField: 'children',
      dataField_includeParent: true,
      dataField_includeIntroVideo: true,
      addProgressStatus: true,
      addProgressPercentage: true,
      addProgressTimestamp: true,
      addNavigateTo: true,
    }
  )) as any
  if (!response) return response

  response.children = mapContentToParent(
    response.children,
    COLLECTION_TYPE.LEARNING_PATH,
    learningPathId
  )
  return response
}

/**
 * Returns learning paths with lessons and progress data
 * @param {number[]} learningPathIds - The learning path IDs
 * @returns {Promise<Object>} Learning paths with enriched lesson data
 */
export async function getEnrichedLearningPaths(learningPathIds: number[]) {
  const response = (await addContextToLearningPaths(
    fetchByRailContentIds,
    learningPathIds,
    COLLECTION_TYPE.LEARNING_PATH,
    {
      dataField: 'children',
      dataField_includeParent: true,
      dataField_includeIntroVideo: true,
      addProgressStatus: true,
      addProgressPercentage: true,
      addProgressTimestamp: true,
      addNavigateTo: true,
    }
  )) as any
  if (!response) return response

  response.forEach((learningPath) => {
    learningPath.children = mapContentToParent(
      learningPath.children,
      COLLECTION_TYPE.LEARNING_PATH,
      learningPath.id
    )
  })
  return response
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
  const learningPath = await getEnrichedLearningPath(learningPathId)
  let dailySession = await getDailySession(brand, userDate); // what if the call just fails, and a DS does exist?
  if (!dailySession) {
    dailySession = await updateDailySession(brand, userDate, false)
  }

  const isActiveLearningPath = (dailySession?.active_learning_path_id || 0) == learningPathId
  if (!isActiveLearningPath) {
    return {
      ...learningPath,
      is_active_learning_path: isActiveLearningPath,
    }
  }
  // this assumes that the first entry is active_path, based on user flows
  const todayContentIds = dailySession.daily_session[0]?.content_ids || []
  const todayLearningPathId = dailySession.daily_session[0]?.learning_path_id

  const nextContentIds = dailySession.daily_session[1]?.content_ids || []
  const nextLearningPathId = dailySession.daily_session[1]?.learning_path_id

  const completedLessons = []
  let thisLPDailies = []
  let nextLPDailies = []
  let previousLearningPathTodays = []
  const upcomingLessons = []

  learningPath.children.forEach((lesson: any) => {
    if (todayContentIds.includes(lesson.id)) {
      thisLPDailies.push(lesson)
    } else if (lesson.progressStatus === 'completed') {
      completedLessons.push(lesson)
    } else {
      upcomingLessons.push(lesson)
    }
  })

  if (thisLPDailies.length == 0) {
    // Daily sessions first lessons are not part of the active learning path, but next lessons are
    // load todays lessons from previous learning path
    previousLearningPathTodays = await getLearningPathLessonsByIds(
      todayContentIds,
      todayLearningPathId
    )
  } else if ( // show next LP dailies if they exist
    nextContentIds.length > 0
  ) {
    // Daily sessions first lessons are the active learning path and the next lessons are not
    // load next lessons from next learning path
    const lessons = await getLearningPathLessonsByIds(nextContentIds, nextLearningPathId)
    nextLPDailies = lessons.map(lesson => ({
      ...lesson,
      in_next_learning_path: STATE.COMPLETED === learningPath.progressStatus
    }))
  }

  return {
    ...learningPath,
    is_active_learning_path: isActiveLearningPath,
    active_learning_path_id: dailySession?.active_learning_path_id,
    active_learning_path_created_at: dailySession?.active_learning_path_created_at,
    upcoming_lessons: upcomingLessons,
    todays_lessons: thisLPDailies,
    next_learning_path_lessons: nextLPDailies,
    next_learning_path_id: nextLearningPathId,
    completed_lessons: completedLessons,
    previous_learning_path_todays: previousLearningPathTodays,
  }
}

/**
 * For an array of contentIds, fetch any content progress with state=completed,
 * including other learning paths and a la carte progress.
 *
 * @param {number[]} contentIds The array of content IDs within the learning path
 * @returns {Promise<number[]>} Array with completed content IDs
 */
export async function fetchLearningPathProgressCheckLessons(
  contentIds: number[]
): Promise<number[]> {
  let query = await getAllCompletedByIds(contentIds)
  let completedProgress = query.data.map((progress) => progress.content_id)
  return contentIds.filter((contentId) => completedProgress.includes(contentId))
}

interface completeMethodIntroVideo {
  intro_video_response: SyncWriteDTO<ContentProgress, any> | null
  active_path_response: ActiveLearningPathResponse
}
/**
 * Handles completion of method intro video and other related actions.
 * @param introVideoId - The method intro video content ID.
 * @param brand
 * @returns {Promise<Array>} response - The response object.
 * @returns {Promise<Object|null>} response.intro_video_response - The intro video completion response or null if already completed.
 * @returns {Promise<Object>} response.active_path_response - The set active learning path response.
 */
export async function completeMethodIntroVideo(
  introVideoId: number,
  brand: string
): Promise<completeMethodIntroVideo> {
  let response = {} as completeMethodIntroVideo

  response.intro_video_response = await completeIfNotCompleted(introVideoId)

  const methodStructure = await fetchMethodV2Structure(brand)
  const learningPathId = methodStructure.learning_paths[0].id

  response.active_path_response = await startLearningPath(brand, learningPathId)

  return response
}

interface completeLearningPathIntroVideo {
  intro_video_response: SyncWriteDTO<ContentProgress, any> | null
  learning_path_reset_response: SyncWriteDTO<ContentProgress, any> | null
  lesson_import_response: SyncWriteDTO<ContentProgress, any> | null
}
/**
 * Handles completion of learning path intro video and other related actions.
 * @param introVideoId - The learning path intro video content ID.
 * @param learningPathId - The content_id of the learning path that this learning path intro video belongs to.
 * @param lessonsToImport - content ids for all lessons with progress found during intro video progress check. empty if user chose not to keep learning path progress.
 * @returns {Promise<Array>} response - The response object.
 * @returns {Promise<Object|null>} response.intro_video_response - The intro video completion response or null if already completed.
 * @returns {Promise<void>} response.learning_path_reset_response - The reset learning path response.
 * @returns {Promise<Object[]>} response.lesson_import_response - The responses for completing each content_id within the learning path.
 */
export async function completeLearningPathIntroVideo(
  introVideoId: number,
  learningPathId: number,
  lessonsToImport: number[] | null
) {
  let response = {} as completeLearningPathIntroVideo

  response.intro_video_response = await completeIfNotCompleted(introVideoId)

  const collection: CollectionObject = { id: learningPathId, type: COLLECTION_TYPE.LEARNING_PATH }

  if (!lessonsToImport) {
    response.learning_path_reset_response = await resetIfPossible(learningPathId, collection)

  } else {
    response.lesson_import_response = await contentsStatusCompleted(lessonsToImport, collection)
  }

  return response
}

async function completeIfNotCompleted(
  contentId: number
): Promise<SyncWriteDTO<ContentProgress, any> | null> {
  const introVideoStatus = await getProgressState(contentId)

  return introVideoStatus !== 'completed' ? await contentStatusCompleted(contentId) : null
}

async function resetIfPossible(contentId: number, collection: CollectionParameter = null): Promise<SyncWriteDTO<ContentProgress, any> | null> {
  const status = await getProgressState(contentId, collection)

  return status !== '' ? await contentStatusReset(contentId, collection) : null
}

export async function onContentCompletedLearningPathListener(event) {
  console.log('if')
  if (event?.collection?.type !== 'learning-path-v2') return
  if (event.contentId !== event?.collection?.id) return
  const learningPathId = event.contentId
  const learningPath = await getEnrichedLearningPath(learningPathId)
  console.log('LP', learningPath)
  const brand = learningPath.brand
  const activeLearningPath = await getActivePath(brand)
  console.log('Active LP', activeLearningPath)
  if (activeLearningPath.active_learning_path_id !== learningPathId) return
  const method = await fetchMethodV2Structure(brand)
  console.log('Method', method)
  const currentIndex = method.learning_paths.findIndex((lp) => lp.id === learningPathId)
  if (currentIndex === -1) {
    return
  }
  const nextLearningPath = method.learning_paths[currentIndex + 1]
  console.log('Next LP', nextLearningPath)
  if (!nextLearningPath) {
    return
  }

  await startLearningPath(brand, nextLearningPath.id)
  const nextLearningPathData = await getEnrichedLearningPath(nextLearningPath.id)
  console.log('Next LP Data', nextLearningPathData)
  await contentStatusReset(nextLearningPathData.intro_video.id)
}
