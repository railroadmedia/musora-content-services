import { awardDefinitions } from '../../src/services/awards/internal/award-definitions'

jest.mock('../../src/services/sanity', () => ({
  default: {
    fetch: jest.fn()
  },
  fetchSanity: jest.fn()
}))

import { fetchSanity } from '../../src/services/sanity'

describe('Award Definitions Cache', () => {
  const mockAwards = [
    {
      _id: 'test-award-1',
      name: 'Test Award',
      brand: 'drumeo',
      content_id: 12345,
      is_active: true,
      content_type: 'guided-course'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    awardDefinitions.clear()
    fetchSanity.mockResolvedValue(mockAwards)
  })

  afterEach(() => {
    awardDefinitions.clear()
  })

  test('loads award definitions on first access', async () => {
    const awards = await awardDefinitions.getAll()

    expect(fetchSanity).toHaveBeenCalled()
    expect(awards).toHaveLength(1)
    expect(awards[0]._id).toBe('test-award-1')
  })

  test('refreshes award definitions when cache expires', async () => {
    awardDefinitions.lastFetch = Date.now() - (25 * 60 * 60 * 1000)

    const awards = await awardDefinitions.getAll()

    expect(fetchSanity).toHaveBeenCalled()
    expect(awards).toHaveLength(1)
  })
})
