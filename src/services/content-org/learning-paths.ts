/**
 * @module LearningPaths
 */

import { GET, POST } from '../../infrastructure/http/HttpClient.ts'
import {
  fetchByRailContentId,
  fetchByRailContentIds,
  fetchMethodV2Structure,
  fetchParentChildRelationshipsFor
} from '../sanity.js'
import { addContextToLearningPaths } from '../contentAggregator.js'
import {
  contentStatusCompleted,
  contentStatusCompletedMany,
  contentStatusReset,
  getAllCompletedByIds,
  getIdsWhereLastAccessedFromMethod,
  getProgressState,
} from '../contentProgress.js'
import { COLLECTION_TYPE, STATE } from '../sync/models/ContentProgress'
import { SyncWriteDTO } from '../sync'
import { ContentProgress } from '../sync/models'
import { CollectionParameter } from '../sync/repositories/content-progress'
import dayjs from 'dayjs'
import { LEARNING_PATH_LESSON } from "../../contentTypeConfig";

const BASE_PATH: string = `/api/content-org`
const LEARNING_PATHS_PATH = `${BASE_PATH}/v1/user/learning-paths`
let dailySessionPromise: Promise<DailySessionResponse> | null = null
let activePathPromise: Promise<ActiveLearningPathResponse> | null = null

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
 * If the daily session doesn't exist, it will be created.
 * @param brand
 * @param userDate - local datetime. must have date and time - format 2025-10-31T13:45:00
 * @param forceRefresh - force cache refresh
 */
export async function getDailySession(
  brand: string,
  userDate: Date,
  forceRefresh: boolean = false
) {
  const dateWithTimezone = formatLocalDateTime(userDate)
  const url: string = `${LEARNING_PATHS_PATH}/daily-session/get?brand=${brand}&userDate=${encodeURIComponent(dateWithTimezone)}`
  try {
    const response = (await dataPromiseGET(url, forceRefresh)) as DailySessionResponse
    if (!response) {
      return await updateDailySession(brand, userDate, false)
    }
    dailySessionPromise = null // reset promise after successful fetch
    return response as DailySessionResponse
  } catch (error: any) {
    if (error.status === 204) {
      return await updateDailySession(brand, userDate, false)
    }
    throw error
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
  keepFirstLearningPath: boolean = false
) {
  const dateWithTimezone = formatLocalDateTime(userDate)
  const url: string = `${LEARNING_PATHS_PATH}/daily-session/create`
  const body = {
    brand: brand,
    userDate: dateWithTimezone,
    keepFirstLearningPath: keepFirstLearningPath,
  }
  try {
    const response = (await POST(url, body)) as DailySessionResponse

    if (response) {
      const urlGet: string = `${LEARNING_PATHS_PATH}/daily-session/get?brand=${brand}&userDate=${encodeURIComponent(dateWithTimezone)}`
      dataPromiseGET(urlGet, true) // refresh cache
    }

    return response
  } catch (error: any) {
    return null
  }
}

function formatLocalDateTime(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD Z')
}

/**
 * Gets user's active learning path.
 * @param brand
 * @param forceRefresh - force cache refresh
 */
export async function getActivePath(brand: string, forceRefresh: boolean = false) {
  const url: string = `${LEARNING_PATHS_PATH}/active-path/get?brand=${brand}`

  const response = (await dataPromiseGET(url, forceRefresh)) as ActiveLearningPathResponse
  activePathPromise = null // reset promise after successful fetch

  return response
}

/**
 * Sets a new learning path as the user's active learning path.
 * @param brand
 * @param learningPathId
 */
export async function startLearningPath(brand: string, learningPathId: number) {
  const url: string = `${LEARNING_PATHS_PATH}/active-path/set`
  const body = { brand: brand, learning_path_id: learningPathId }

  const response = (await POST(url, body)) as ActiveLearningPathResponse

  // manual BE call to avoid recursive POST<->GET calls
  if (response) {
    const urlGet: string = `${LEARNING_PATHS_PATH}/active-path/get?brand=${brand}`
    dataPromiseGET(urlGet, true) // refresh cache
  }

  return response
}

async function dataPromiseGET(
  url: string,
  forceRefresh: boolean
): Promise<DailySessionResponse | ActiveLearningPathResponse> {
  if (url.includes('daily-session')) {
    if (!dailySessionPromise || forceRefresh) {
      dailySessionPromise = GET(url, {
        cache: forceRefresh ? 'reload' : 'default',
      }) as Promise<DailySessionResponse>
    }
    return dailySessionPromise
  } else if (url.includes('active-path')) {
    if (!activePathPromise || forceRefresh) {
      activePathPromise = GET(url, {
        cache: forceRefresh ? 'reload' : 'default',
      }) as Promise<ActiveLearningPathResponse>
    }
    return activePathPromise
  }
}

/**
 * Resets the user's learning path.
 */
export async function resetAllLearningPaths() {
  const url: string = `${LEARNING_PATHS_PATH}/reset`
  return await POST(url, {})
}

/**
 * Returns learning path with lessons and progress data
 * @param {number} learningPathId - The learning path ID
 * @returns {Promise<Object>} Learning path with enriched lesson data
 */
export async function getEnrichedLearningPath(learningPathId) {
  let response = (await addContextToLearningPaths(
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
      addResumeTimeSeconds: true,
      addNavigateTo: true,
    }
  )) as any
  // add awards to LP parents only
  response = await addContextToLearningPaths(() => response, { addAwards: true })
  if (!response) return response

  response.children = mapContentToParent(
      response.children,
      {lessonType: LEARNING_PATH_LESSON, parentContentId: learningPathId}
  )
  return response
}

/**
 * Returns learning paths with lessons and progress data
 * @param {number[]} learningPathIds - The learning path IDs
 * @returns {Promise<Object>} Learning paths with enriched lesson data
 */
export async function getEnrichedLearningPaths(learningPathIds: number[]) {
  let response = (await addContextToLearningPaths(
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
      addResumeTimeSeconds: true,
      addNavigateTo: true,
    }
  )) as any
  // add awards to LP parents only
  response = await addContextToLearningPaths(() => response, { addAwards: true })

  if (!response) return response

  response.forEach((learningPath) => {
    learningPath.children = mapContentToParent(
        learningPath.children,
        {lessonType: LEARNING_PATH_LESSON, parentContentId: learningPath.id}
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
 * @param lessons - sanity documents
 * @param parentContentType
 * @param parentContentId
 */
export function mapContentToParent(
  lessons: any,
  options?: { lessonType?: string; parentContentId?: number }
) {
  if (!lessons) return lessons

  function mapIt(lesson: any) {
    const mappedLesson = { ...lesson }
    if (options?.lessonType !== undefined) mappedLesson.type = options.lessonType
    if (options?.parentContentId !== undefined) mappedLesson.parent_id = options.parentContentId
    return mappedLesson

  }

  if (typeof lessons === 'object' && !Array.isArray(lessons)) {
    return mapIt(lessons)

  } else if (Array.isArray(lessons)) {
    return lessons.map((lesson: any) => {
      return mapIt(lesson)
    })
  }
}

interface fetchLearningPathLessonsResponse {
  id: number
  thumbnail?: string
  title: string
  children: any[]
  is_active_learning_path: boolean
  active_learning_path_id?: number
  active_learning_path_created_at?: string
  upcoming_lessons?: any[]
  completed_lessons?: any[]
  learning_path_dailies?: any[]
  next_learning_path_dailies?: any[]
  next_learning_path_id?: number
  previous_learning_path_dailies?: any[]
  previous_learning_path_id?: number
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
 * @returns {Array} result.children - Array of all lessons.
 * @returns {boolean} result.is_active_learning_path - Whether the learning path is currently active.
 * @returns {number} result.active_learning_path_id - The active learning path ID from daily session.
 * @returns {string} result.active_learning_path_created_at - The datetime the learning path was set as active.
 * @returns {Array} result.upcoming_lessons - Array of upcoming lessons.
 * @returns {Array} result.learning_path_dailies - Array of today's dailies in this learning path.
 * @returns {Array} result.next_learning_path_dailies - Array of today's dailies in the next learning path.
 * @returns {number} result.next_learning_path_id - the next learning path (after the active path).
 * @returns {Array} result.completed_lessons - Array of completed lessons in this learning path.
 * @returns {Array} result.previous_learning_path_dailies - Array of today's dailies in the previous learning path.
 * @returns {number} result.previous_learning_path_id - the previous learning path (before the active path)
 */
export async function fetchLearningPathLessons(
  learningPathId: number,
  brand: string,
  userDate: Date
) {
  const learningPath = await getEnrichedLearningPath(learningPathId)
  let dailySession = (await getDailySession(brand, userDate)) as DailySessionResponse // what if the call just fails, and a DS does exist?
  if (!dailySession) {
    dailySession = (await updateDailySession(brand, userDate, false)) as DailySessionResponse
  }

  const isActiveLearningPath = (dailySession?.active_learning_path_id || 0) == learningPathId
  if (!isActiveLearningPath) {
    return {
      ...learningPath,
      is_active_learning_path: isActiveLearningPath,
    } as fetchLearningPathLessonsResponse
  }

  let todayContentIds = []
  let todayLearningPathId = null
  let nextContentIds = []
  let nextLearningPathId = null
  let previousContentIds = []
  let previousLearningPathId = null

  for (const session of dailySession.daily_session) {
    if (session.learning_path_id === learningPathId) {
      todayContentIds = session.content_ids || []
      todayLearningPathId = session.learning_path_id
    } else {
      if (!todayLearningPathId) {
        previousContentIds = session.content_ids || []
        previousLearningPathId = session.learning_path_id
      } else if (!nextLearningPathId) {
        nextContentIds = session.content_ids || []
        nextLearningPathId = session.learning_path_id
      }
    }
  }

  const completedLessons = []
  let thisLPDailies = []
  let nextLPDailies = []
  let previousLPDailies = []
  const upcomingLessons = []

  //previous/next never within LP
  learningPath.children.forEach((lesson: any) => {
    if (todayContentIds.includes(lesson.id)) {
      thisLPDailies.push(lesson)
    } else if (lesson.progressStatus === STATE.COMPLETED) {
      completedLessons.push(lesson)
    } else {
      upcomingLessons.push(lesson)
    }
  })

  if (previousContentIds.length !== 0) {
    previousLPDailies = await getLearningPathLessonsByIds(
      previousContentIds,
      previousLearningPathId
    )
  }
  if (nextContentIds.length !== 0) {
    nextLPDailies = await getLearningPathLessonsByIds(nextContentIds, nextLearningPathId).then(
      (lessons) =>
        lessons.map((lesson) => ({
          ...lesson,
          in_next_learning_path: learningPath.progressStatus === STATE.COMPLETED,
        }))
    )
  }

  return {
    ...learningPath,
    is_active_learning_path: isActiveLearningPath,
    active_learning_path_id: dailySession?.active_learning_path_id,
    active_learning_path_created_at: dailySession?.active_learning_path_created_at,
    upcoming_lessons: upcomingLessons,
    completed_lessons: completedLessons,
    learning_path_dailies: thisLPDailies,
    next_learning_path_dailies: nextLPDailies,
    next_learning_path_id: nextLearningPathId,
    previous_learning_path_dailies: previousLPDailies,
    previous_learning_path_id: previousLearningPathId,
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

  const methodStructure = await fetchMethodV2Structure(brand)

  const firstLearningPathId = methodStructure.learning_paths[0].id
  response.active_path_response = await methodIntroVideoCompleteActions(
    brand,
    firstLearningPathId,
    new Date()
  )

  response.intro_video_response = await completeIfNotCompleted(introVideoId)

  return response
}

async function methodIntroVideoCompleteActions(brand: string, learningPathId: number, userDate: Date) {
  const dateWithTimezone = formatLocalDateTime(userDate)
  const url: string = `${LEARNING_PATHS_PATH}/method-intro-video-complete-actions`
  const body = { brand: brand, learningPathId: learningPathId, userDate: dateWithTimezone }
  return (await POST(url, body)) as DailySessionResponse
}

interface completeLearningPathIntroVideo {
  intro_video_response: SyncWriteDTO<ContentProgress, any> | null
  learning_path_reset_response: SyncWriteDTO<ContentProgress, any> | null
  lesson_import_response: SyncWriteDTO<ContentProgress, any> | null
  update_dailies_response: DailySessionResponse | null
}
/**
 * Handles completion of learning path intro video and other related actions.
 * @param introVideoId - The learning path intro video content ID.
 * @param learningPathId - The content_id of the learning path that this learning path intro video belongs to.
 * @param lessonsToImport - content ids for all lessons with progress found during intro video progress check. empty if user chose not to keep learning path progress.
 * @param brand
 * @returns {Promise<Array>} response - The response object.
 * @returns {Promise<Object|null>} response.intro_video_response - The intro video completion response or null if already completed.
 * @returns {Promise<void>} response.learning_path_reset_response - The reset learning path response.
 * @returns {Promise<Object[]>} response.lesson_import_response - The responses for completing each content_id within the learning path.
 */
export async function completeLearningPathIntroVideo(
  introVideoId: number,
  learningPathId: number,
  lessonsToImport: number[] | null,
  brand: string | null
) {
  let response = {} as completeLearningPathIntroVideo

  const collection: CollectionObject = { id: learningPathId, type: COLLECTION_TYPE.LEARNING_PATH }

  if (!lessonsToImport) {
    response.learning_path_reset_response = await resetIfPossible(learningPathId, collection)
  } else {
    response.lesson_import_response = await contentStatusCompletedMany(lessonsToImport, collection)
    const activePath = await getActivePath(brand)

    if (activePath.active_learning_path_id === learningPathId) {
      response.update_dailies_response = await updateDailySession(brand, new Date(), true)
    }
  }

  response.intro_video_response = await completeIfNotCompleted(introVideoId)

  return response
}

async function completeIfNotCompleted(
  contentId: number
): Promise<SyncWriteDTO<ContentProgress, any> | null> {
  const introVideoStatus = await getProgressState(contentId)

  return introVideoStatus !== 'completed' ? await contentStatusCompleted(contentId) : null
}

async function resetIfPossible(
  contentId: number,
  collection: CollectionParameter = null
): Promise<SyncWriteDTO<ContentProgress, any> | null> {
  const status = await getProgressState(contentId, collection)

  return status !== '' ? await contentStatusReset(contentId, collection) : null
}

export async function onContentCompletedLearningPathActions(
  contentId: number,
  collection: CollectionObject | null
) {
  if (collection?.type !== COLLECTION_TYPE.LEARNING_PATH) return
  if (contentId !== collection?.id) return

  const learningPathId = contentId
  const learningPath = await getEnrichedLearningPath(learningPathId)

  const brand = learningPath.brand
  const activeLearningPath = await getActivePath(brand)

  if (activeLearningPath.active_learning_path_id !== learningPathId) return
  const method = await fetchMethodV2Structure(brand)

  const currentIndex = method.learning_paths.findIndex((lp) => lp.id === learningPathId)
  if (currentIndex === -1) {
    return
  }
  const nextLearningPath = method.learning_paths[currentIndex + 1]
  if (!nextLearningPath) {
    return
  }

  await startLearningPath(brand, nextLearningPath.id)
  const nextLearningPathData = await getEnrichedLearningPath(nextLearningPath.id)

  await contentStatusReset(nextLearningPathData.intro_video.id, { skipPush: true })
}

export async function mapContentsThatWereLastProgressedFromMethod(objects: any[]) {
  if (!objects || objects.length === 0) return objects

  const contentIds = objects.map((obj) => obj.id) as number[]
  const trueIds = await getIdsWhereLastAccessedFromMethod(contentIds)

  if (trueIds.length === 0) return objects

  let filtered = objects.filter((obj) => trueIds.includes(obj.id))

  filtered = await mapLearningPathParentsTo(filtered, {type: true, parent_id: true})

  // Map each filtered item back into the total contents object
  objects = objects.map((item) => {
    const replace = filtered.find((f) => f.id === item.id) || item
    return replace
  })

  return objects

}

export async function mapLearningPathParentsTo(objects: any[], fieldsToMap?: {type?: boolean, parent_id?: boolean}): Promise<object[]> {
  const ids = objects.map((obj: any) => obj.id) as number[]
  const hierarchy = await fetchParentChildRelationshipsFor(ids, COLLECTION_TYPE.LEARNING_PATH)

  const parentMap = new Map<number, number>()
  hierarchy.forEach((relation) => {
    relation.children.forEach((childId) => {
      parentMap.set(childId, Number(relation.railcontent_id))
    })
  })

  return objects.map((obj) => {
    const parent_id = parentMap.get(obj.id) ?? undefined
    return mapContentToParent(obj, {
      lessonType: fieldsToMap.type ? LEARNING_PATH_LESSON : undefined,
      parentContentId: fieldsToMap.parent_id ? parent_id : undefined
    })
  })
}
