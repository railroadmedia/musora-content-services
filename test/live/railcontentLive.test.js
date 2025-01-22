import { initializeTestService } from '../initializeTests'
import { fetchChallengeIndexMetadata } from '../../src'

describe('railcontentLive', function () {
  beforeEach(async () => {
    await initializeTestService(true)
  }, 1000000)

  test('challengeIndexMetadata', async () => {
    let contentId = 281709
    let results = await fetchChallengeIndexMetadata([contentId])
    expect(Array.isArray(results)).toBe(true)
  })
})
