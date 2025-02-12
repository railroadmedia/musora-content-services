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
    expect(results.type).toBeDefined()
    expect(results.type).toBe('sections')
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
    expect(results.meta.filters).toBeDefined()
    expect(results.meta.sort).toBeDefined()
  })

  test('getTabResults-Singles', async () => {
    const results = await getTabResults('drumeo','lessons','Individuals', {selectedFilters:['difficulty,All','difficulty,Beginner']})
    console.log(results)
    expect(results.type).toBeDefined()
    expect(results.type).toBe('catalog')
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
    expect(results.meta.filters).toBeDefined()
    expect(results.meta.sort).toBeDefined()
  })

  test('getTabResults-Courses', async () => {
    const results = await getTabResults('pianote','lessons','Collections', {selectedFilters:['difficulty,Expert'], sort:'slug'})
    console.log(results)
    expect(results.type).toBeDefined()
    expect(results.type).toBe('catalog')
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
    expect(results.meta.filters).toBeDefined()
    expect(results.meta.sort).toBeDefined()
  })

  test('getTabResults-Filters', async () => {
    const results = await getTabResults('pianote','lessons','Filters', {selectedFilters:['difficulty,Expert'], sort:'slug'})
    console.log(results)
    expect(results.type).toBeDefined()
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
    expect(results.meta.filters).toBeDefined()
    expect(results.meta.sort).toBeDefined()
  })
})
