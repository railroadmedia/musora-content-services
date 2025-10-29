import {findIncompleteLesson} from "../userActivity";

interface dailySessionItem {
  learningPathId: number,
  contentIds: number[]
}

export async function getNextLearningPathLessonsForMethod(
    progressData: object[]|null,
    activePath: dailySessionItem|null, //turns out this is the right structure
    dailySession: dailySessionItem[]|null,
): Promise<dailySessionItem[] | dailySessionItem | [] | null> {
  if (!progressData || Object.keys(progressData).length === 0) {
    return null

  } else {
    const dailySessionIds = dailySession?.map((item: dailySessionItem) => item.contentIds).flat()
    const dailySessionProgress = dailySessionIds ? progressData.filter((item: any) => dailySessionIds.includes(item.content_id)) : null

    const isDailyComplete = dailySessionProgress ? areAllCompleted(dailySessionProgress) : false

    if (!isDailyComplete) {
      return dailySession

    } else {
      // active path is set if daily session is.
      const learningPathProgress = progressData.filter((item: any) => activePath.contentIds.includes(item.content_id))

      if (areAllCompleted(learningPathProgress)) {
        return []
      }

      const nextLesson = findIncompleteLesson(learningPathProgress, null, 'learning-path')
      return {learningPathId: activePath.learningPathId, contentIds: [nextLesson]} as dailySessionItem
    }
  }
}

function areAllCompleted(progress: any[]): boolean
{
  progress.forEach(item => {
    if (item.status !== 'completed') {
      return false
    }
  });
  return true
}
