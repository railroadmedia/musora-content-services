import { fetchHandler } from '../railcontent.js'
import { fetchByRailContentId, fetchByRailContentIds, fetchMethodV2Structure } from '../sanity.js'
import { addContextToContent } from '../contentAggregator.js'
import { getProgressStateByIds } from '../contentProgress.js'
/**
 * @module LearningPaths
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
    fetchByRailContentId(learningPathId, 'learning-path-v2'),
    getDailySession(brand, userDate),
  ])

  const addContextParameters = {
    addProgressStatus: true,
    addProgressPercentage: true,
  }

  const lessons = await addContextToContent(() => learningPath.children, addContextParameters)
  const isActiveLearningPath = (dailySession?.active_learning_path_id || 0) == learningPathId
  const manipulatedLessons = lessons.map((lesson: any) => {
    return { ...lesson, type: 'learning-path-lesson-v2', parent_id: learningPathId }
  })

  if (!isActiveLearningPath) {
    return {
      ...learningPath,
      is_active_learning_path: isActiveLearningPath,
      children: manipulatedLessons,
    }
  }

  const todayContentIds = dailySession.daily_session[0]?.content_ids || []
  const nextContentIds = dailySession.daily_session[1]?.content_ids || []
  const completedLessons = []
  let todaysLessons = []
  let nextLPLessons = []
  const upcomingLessons = []

  manipulatedLessons.forEach((lesson: any) => {
    if (todayContentIds.includes(lesson.id)) {
      todaysLessons.push(lesson)
    } else if (lesson.progressStatus === 'completed') {
      completedLessons.push(lesson)
    } else {
      upcomingLessons.push(lesson)
    }
  })

  let previousLearnigPathTodays = []
  if (todaysLessons.length == 0) {
    // Daily sessions first lessons are not part of the active learning path, but next lessons are
    // load todays lessons from previous learning path
    previousLearnigPathTodays = await addContextToContent(
      fetchByRailContentIds,
      todayContentIds,
      addContextParameters
    )
  } else if (
    nextContentIds.length > 0 &&
    todaysLessons.length < 3 &&
    upcomingLessons.length === 0
  ) {
    // Daily sessions first lessons are the active learning path and the next lessons are not
    // load next lessons from next learning path
    nextLPLessons = await addContextToContent(
      fetchByRailContentIds,
      nextContentIds,
      addContextParameters
    )
  }

  return {
    ...learningPath,
    is_active_learning_path: isActiveLearningPath,
    children: manipulatedLessons,
    upcoming_lessons: upcomingLessons,
    todays_lessons: todaysLessons,
    next_learning_path_lessons: nextLPLessons,
    completed_lessons: completedLessons,
    previous_learning_path_todays: previousLearnigPathTodays,
  }
}
import ProgressRepository from "../sync/repositories/content-progress";
import {findIncompleteLesson} from "../userActivity";

const PARENT_TYPE_LEARNING_PATH = 'learning-path';

const DATA_KEY_STATE = 'state';

interface dailySessionItem {
  learningPathId: number,
  contentIds: number
}


export async function getNextLearningPathLesson( //there's gotta be a better name for this
  progressData: object[],
  brand: string,
  activePathId: number,
  dailySession: dailySessionItem[],
  methodStructure: object
): Promise<object>
{
  let contentData: any
  // if no progress on method at all
  if (!progressData || Object.keys(progressData).length === 0) {
    // sanity method IV
    // if we're just returning ids from this then how do we indicate that this
    // return needs to be a sanity fetch, without the actual contentId?
    return {}

  } else {
    // const activePathId = await getActiveLearningPath(brand)
    // const dailySession = getDailySession(brand)

    // get progress for daily session ids
    const dailySessionIds = dailySession.map((item: dailySessionItem) => item.contentIds)
    const dailySessionProgress = await getKeyedProgress(dailySessionIds, PARENT_TYPE_LEARNING_PATH)

    const isDailyComplete = dailySessionProgress ? checkIfDailyComplete(dailySessionProgress) : false
    if (isDailyComplete) {
      const activePathLessons = await getLearningPathLessons(activePathId)

      const mergedProgressData = activePathLessons.map(id => {
        return progressData[id] ? progressData[id][DATA_KEY_STATE] : ''
      })

      const nextLesson = findIncompleteLesson(mergedProgressData, null, 'learning-path')

      contentData = [{ collectionId: activePathId, ids: nextLesson }]
    } else {
      contentData = dailySessionProgress
    }
    return {data: contentData, isDailyComplete: isDailyComplete}
  }
}

function checkIfDailyComplete(dailySession: any[]): boolean
{
  dailySession.forEach(session => {
    if (session.status !== 'completed') {
      return false
    }
  });
  return true
}

// export async function getActiveLearningPathLessons(brand: string): Promise<{parent: number, lessons: number[]}>
// {
//   const activeLearningPath = await getActiveLearningPath(brand)
//
//   getLearningPathLessons(activeLearningPath)
//
//   return {parent: activeLearningPath, lessons: [1,2,3]}
// }

async function getActiveLearningPath(brand: string): Promise<number>
{
  // fetch from the cache

  // if no cache value then fetch from BE
  return 0
}

async function getLearningPathLessons(learningPathId: number): Promise<number[]>
{
  // fetch from the cache
}

function getDailySession(brand: string): object[]|[]
{
  // get from cache /// if none get from BE

  // can be < 3 if at end of last LP
  return [{id: 1, collectionId: 1}, {id: 2, collectionId: 1}, {id: 3, collectionId: 2}]
}

// this feels weird. should this be in the repository?
async function getKeyedProgress(ids: number[], parentType: string): Promise<object[]>
{
  const records = await ProgressRepository.create().getProgressByContentIds({
    contentIds: ids,
    parentType: parentType,
    parentId: null,
  })
  return ids.map(id => records.find(r => r.content_id === id))
}
