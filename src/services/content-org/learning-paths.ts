import {findIncompleteLesson} from "../userActivity";

interface DailySessionItem {
  learningPathId: number,
  contentIds: number[]
}

interface NextLessonsResponse {
  next: DailySessionItem[] | [],
  dailyComplete: boolean
}

/**
 * Get the next lessons for a method's learning path based on user progress and daily session, for method progress card
 * @param progressData - user progress data for all method content
 * @param activePath - the active path + children, from the method structure
 * @param dailySession
 */
export async function getNextLearningPathLessonsForMethod(
    progressData: object[]|null,
    activePath: DailySessionItem|null, //turns out this is the right structure. this is not the cached value
    dailySession: DailySessionItem[]|null,
): Promise<NextLessonsResponse|null> {
  if (!progressData) {
    console.log('null', null)
    return null

  } else {
    const dailySessionIds = dailySession?.map((item: DailySessionItem) => item.contentIds).flat()
    const dailySessionProgress = dailySessionIds ? progressData.filter((item: any) => dailySessionIds.includes(item.content_id)) : null

    const isDailyComplete = dailySessionProgress ? areAllCompleted(dailySessionProgress) : false

    if (!isDailyComplete) {
      return {next: dailySession, dailyComplete: isDailyComplete}

    } else {
      // active path is set if daily session is.
      const learningPathProgress = progressData.filter((item: any) => activePath.contentIds.includes(item.content_id))

      if (areAllCompleted(learningPathProgress)) {
        return {next: [], dailyComplete: isDailyComplete}
      }

      const nextLesson = findIncompleteLesson(learningPathProgress, null, 'learning-path')
      return {
        next: [
          {
            learningPathId: activePath.learningPathId,
            contentIds: [nextLesson]
          }
        ],
        dailyComplete: isDailyComplete
      }
    }
  }
}

export function areAllCompleted(progress: any[]): boolean
{
  progress.forEach(item => {
    if (item.status !== 'completed') {
      return false
    }
  });
  return true
}

export function areNoneCompleted(progress: any[]): boolean
{
  progress.forEach(item => {
    if (item.status === 'completed') {
      return false
    }
  });
  return true
}

export function isFirstLearningPathCompleted(progress: any[]): boolean
{
  let firstId: number
  progress.forEach(item => {
    if (!firstId) { firstId = item.learningPathId }
    if (item.learningPathId === firstId && item.status !== 'completed') {
      return false
    }
  });
  return true
}
