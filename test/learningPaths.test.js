import { initializeTestService } from './initializeTests.js'
import {
  fetchLearningPathLessons,
  getEnrichedLearningPath,
  startLearningPath,
} from '../src/services/content-org/learning-paths.ts'
import { contentStatusCompleted } from '../src/services/contentProgress.js'
describe('learning-paths', function () {
  beforeEach(async () => {
    await initializeTestService(true)
  })

  afterEach(async () => {
    // Flush all pending promises
    await new Promise((resolve) => setImmediate(resolve))
  })

  test('getLearningPathsV2Test', async () => {
    const results = await getLearningPath(417140)
  })
  test('getlearningPathLessonsTestNew', async () => {
    await contentStatusCompleted(417105)
    const userDate = new Date('2025-10-31')
    const results = await fetchLearningPathLessons(422533, 'drumeo', userDate)
    console.log(results)
  // test('getlearningPathLessonsTestNew', async () => {
  //   await contentStatusCompleted(417105)
  //   const userDate = new Date('2025-10-31')
  //   const results = await fetchLearningPathLessons(422533, 'drumeo', userDate)
  //   console.log(results)
  // })
  //
  test('learningPathCompletion', async () => {
    const learningPathId = 435527
    await contentStatusReset(learningPathId)

    await startLearningPath('drumeo', learningPathId)
    const collection = { type: 'learning-path-v2', id: learningPathId }
    const learningPath = await getEnrichedLearningPath(learningPathId)

    // Complete each child one by one
    for (const child of learningPath.children) {
      await contentStatusReset(child.id)
      await contentStatusCompleted(child.id, collection)

      // Check child status
      const childProgress = await getProgressDataByIds([child.id], collection)

      // Check parent status after each child
      const parentProgress = await getProgressDataByIds([learningPathId], collection)
    }

    // Final check - parent should be completed
    const finalParentProgress = await getProgressDataByIds([learningPathId], collection)
    console.log('\n--- Final parent progress:', finalParentProgress)
    expect(finalParentProgress[learningPathId]?.status).toBe('completed')

    await new Promise((resolve) => setTimeout(resolve, 5000))
  })
})
