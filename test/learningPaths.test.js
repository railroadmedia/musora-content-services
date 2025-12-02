import { initializeTestService } from './initializeTests.js'
import {
  fetchLearningPathLessons,
  getEnrichedLearningPath,
} from '../src/services/content-org/learning-paths.ts'
import {
  getProgressDataByIds,
  contentStatusCompleted,
  contentStatusReset,
} from '../src/services/contentProgress.js'
describe('learning-paths', function () {
  beforeEach(async () => {
    await initializeTestService(true)
    await new Promise((resolve) => setImmediate(resolve))
  })

  test('getLearningPathsV2Test', async () => {
    const results = await getEnrichedLearningPath(417140)
  })
  // test('getlearningPathLessonsTestNew', async () => {
  //   await contentStatusCompleted(417105)
  //   const userDate = new Date('2025-10-31')
  //   const results = await fetchLearningPathLessons(422533, 'drumeo', userDate)
  //   console.log(results)
  // })
  //
  test('learningPathCompletion', async () => {
    const learningPathId = 435527
    const contentId = 436574
    await contentStatusReset(contentId)
    await contentStatusReset(learningPathId)
    const collection = { type: 'learning-path-v2', id: learningPathId }
    // const learningPath = await getEnrichedLearningPath(435526)
    await contentStatusCompleted(contentId, collection)
    console.log(await getProgressDataByIds([contentId], collection))
    console.log(await getProgressDataByIds([learningPathId], collection))
  })
})
