import { initializeTestService } from './initializeTests.js'
import { getLessonContentRows, getTabResults } from '../src/services/content.js'

describe('content', function () {
  beforeEach(() => {
    initializeTestService()
  })

  test('getLessonContentRows', async () => {
    const results = await getLessonContentRows()
    console.log(results)
  })

  test('getTabResults-For-You', async () => {
    const results = await getTabResults('drumeo','lessons','For You')
    console.log(results)
  })

  test('getTabResults-Singles', async () => {
    const results = await getTabResults('drumeo','lessons','Singles', {selectedFilters:['difficulty,All','difficulty,Beginner']})
    console.log(results)
  })

  test('getTabResults-Courses', async () => {
    const results = await getTabResults('pianote','lessons','Courses', {selectedFilters:['difficulty,Expert'], sort:'slug'})
    console.log(results)
  })
})
