import { initializeTestService } from '../initializeTests.js'
import { getRecommendedForYou } from '../../src/index.js'

describe('Recommended System', function() {
  beforeAll(async () => {
    await initializeTestService(true)
  })

  test('getRecommendedForYou', async () => {
    const results = await getRecommendedForYou('drumeo')
    log(results)
    expect(results.id).toBeDefined()
    expect(results.title).toBeDefined()
    expect(results.items).toBeDefined()
    expect(results.items.length).toBeGreaterThanOrEqual(1)
  })

  test('getRecommendedForYou-SeeAll', async () => {
    const results = await getRecommendedForYou('drumeo', 'recommended', { page: 1, limit: 20 })
    log(results)
    expect(results.type).toBeDefined()
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
    expect(results.data.length).toBeGreaterThanOrEqual(1)
  })

  test('fetchMetadata', async () => {
    const response = await fetchMetadata('singeo', 'recent-activities')
    log(response)
    expect(response.tabs.length).toBeGreaterThan(0)
  })
})
