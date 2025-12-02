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
    await contentStatusReset(435526)
    await contentStatusReset(435481)

    const learningPath = await getEnrichedLearningPath(435526)

    const response = await contentStatusCompleted(435481, { type: 'learning-path-v2', id: 435526 })
    console.log(response)
    const result = await getProgressDataByIds([435481, 435526])
    console.log(result)
  })
})
