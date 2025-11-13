import { initializeTestService } from './initializeTests.js'
import {
  fetchLearningPathLessons,
  getLearningPath,
} from '../src/services/content-org/learning-paths.ts'
import { contentStatusCompleted } from '../src/services/contentProgress.js'
describe('learning-paths', function () {
  beforeEach(async () => {
    await initializeTestService(true)
  })

  test('getLearningPathsV2Test', async () => {
    const results = await getLearningPath(417140)
  })
  test('getlearningPathLessonsTestNew', async () => {
    await contentStatusCompleted(417105)
    const userDate = new Date('2025-10-31')
    const results = await fetchLearningPathLessons(422533, 'drumeo', userDate)
    console.log(results)
  })
})
