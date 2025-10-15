import ProgressRepository from "../sync/repositories/content-progress";
import {findIncompleteLesson} from "../userActivity";

const PARENT_TYPE_LEARNING_PATH = 'learning-path';

const DATA_KEY_STATE = 'state';



export async function getNextLearningPathLesson(progressData: object[], brand: string): Promise<object>
{
  let contentData: any
  // if no progress on method at all
  if (!progressData || Object.keys(progressData).length === 0) {
    // sanity method IV
    // if we're just returning ids from this then how do we indicate that this
    // return needs to be a sanity fetch, without the actual contentId?
    return {}

  } else {
    const activePathId = await getActiveLearningPath(brand)
    const dailySession = getDailySession(brand)

    // refactor to utilize parent
    const dailySessionProgress = await getKeyedProgress(dailySession, PARENT_TYPE_LEARNING_PATH)

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
