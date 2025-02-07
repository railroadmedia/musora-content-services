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
    console.log(results.meta)
  })

  test('getTabResults-Singles', async () => {
    const results = await getTabResults('drumeo','lessons','Singles', {includedFields:['difficulty,All','difficulty,Beginner']})
    console.log(results.meta.filters[0])
  })

  test('getTabResults-Courses', async () => {
    const results = await getTabResults('pianote','lessons','Courses', {includedFields:['difficulty,Expert']})
    console.log(results.meta.filters[2])
  })
})
