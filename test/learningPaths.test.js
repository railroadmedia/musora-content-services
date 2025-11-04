import { initializeTestService } from './initializeTests.js'
import { fetchLearningPathLessons } from '../src/services/content-org/learning-paths.ts'
import { fetchByRailContentId } from '../src/services/sanity.js'
import { contentStatusCompleted } from '../src/services/contentProgress.js'
describe('learning-paths', function () {
  beforeEach(async () => {
    await initializeTestService(true)
  })

  test('getLearningPathsV2Test', async () => {
    const results = await fetchByRailContentId(417140, 'learning-path-v2')
  })
  test('getlearningPathLessonsTestNew', async () => {
    await contentStatusCompleted(417105)
    const userDate = new Date('2025-10-31')
    const results = await fetchLearningPathLessons(417140, 'drumeo', userDate)
    console.log(results)
  })
})
