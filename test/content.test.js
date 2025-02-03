import { initializeTestService } from './initializeTests.js'
import { getLessonContentRows } from '../src/services/content.js'

describe('content', function () {
  beforeEach(() => {
    initializeTestService()
  })

  test('getLessonContentRows', async () => {
    const results = await getLessonContentRows()
    console.log(results)
  })

})
