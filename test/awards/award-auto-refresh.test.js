import { initializeService } from '../../src/services/config'
import { awardDefinitions } from '../../src/services/awards/award-definitions'

jest.mock('../../src/services/sanity', () => ({
  default: {
    fetch: jest.fn()
  },
  fetchSanity: jest.fn()
}))

import sanityClient, { fetchSanity } from '../../src/services/sanity'

describe('Award Auto-Refresh', () => {
  let mockLocalStorage

  beforeEach(() => {
    jest.clearAllMocks()
    awardDefinitions.clear()

    mockLocalStorage = {
      getItem: jest.fn().mockResolvedValue(null),
      setItem: jest.fn().mockResolvedValue(undefined)
    }

    const mockAwards = [
      {
        _id: 'test-award-1',
        name: 'Test Award',
        brand: 'drumeo',
        content_id: 12345,
        is_active: true
      }
    ]

    sanityClient.fetch = jest.fn().mockResolvedValue(mockAwards)
    fetchSanity.mockResolvedValue(mockAwards)
  })

  afterEach(() => {
    awardDefinitions.clear()
  })

  test('automatically initializes award definitions on initializeService', async () => {
    initializeService({
      sanityConfig: { token: 'test', projectId: 'test', dataset: 'test', version: 'v1' },
      railcontentConfig: { token: 'test', userId: '1', baseUrl: 'http://test.com', authToken: 'test' },
      localStorage: mockLocalStorage,
      isMA: false
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(awardDefinitions.initialized).toBe(true)
    expect(sanityClient.fetch).toHaveBeenCalled()
  })

  test('loads last fetch timestamp from localStorage', async () => {
    const yesterday = Date.now() - (23 * 60 * 60 * 1000)
    mockLocalStorage.getItem.mockResolvedValue(yesterday.toString())

    awardDefinitions.definitions.set('test-award-1', {
      _id: 'test-award-1',
      name: 'Test Award',
      brand: 'drumeo',
      content_id: 12345,
      is_active: true
    })

    initializeService({
      sanityConfig: { token: 'test', projectId: 'test', dataset: 'test', version: 'v1' },
      railcontentConfig: { token: 'test', userId: '1', baseUrl: 'http://test.com', authToken: 'test' },
      localStorage: mockLocalStorage,
      isMA: false
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('musora_award_definitions_last_fetch')
    expect(awardDefinitions.lastFetch).toBeGreaterThan(0)
    expect(awardDefinitions.lastFetch).toBeLessThanOrEqual(Date.now())
    expect(sanityClient.fetch).not.toHaveBeenCalled()
  })

  test('refreshes if last fetch is older than 24 hours', async () => {
    const twoDaysAgo = Date.now() - (25 * 60 * 60 * 1000)
    mockLocalStorage.getItem.mockResolvedValue(twoDaysAgo.toString())

    initializeService({
      sanityConfig: { token: 'test', projectId: 'test', dataset: 'test', version: 'v1' },
      railcontentConfig: { token: 'test', userId: '1', baseUrl: 'http://test.com', authToken: 'test' },
      localStorage: mockLocalStorage,
      isMA: false
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(sanityClient.fetch).toHaveBeenCalled()
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'musora_award_definitions_last_fetch',
      expect.any(String)
    )
  })

  test('saves timestamp to localStorage after fetch', async () => {
    initializeService({
      sanityConfig: { token: 'test', projectId: 'test', dataset: 'test', version: 'v1' },
      railcontentConfig: { token: 'test', userId: '1', baseUrl: 'http://test.com', authToken: 'test' },
      localStorage: mockLocalStorage,
      isMA: false
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'musora_award_definitions_last_fetch',
      expect.any(String)
    )

    const savedTimestamp = parseInt(mockLocalStorage.setItem.mock.calls[0][1], 10)
    expect(savedTimestamp).toBeGreaterThan(Date.now() - 1000)
  })

  test('works without localStorage (no persistence)', async () => {
    initializeService({
      sanityConfig: { token: 'test', projectId: 'test', dataset: 'test', version: 'v1' },
      railcontentConfig: { token: 'test', userId: '1', baseUrl: 'http://test.com', authToken: 'test' },
      localStorage: null,
      isMA: false
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(awardDefinitions.initialized).toBe(false)
  })

  test('cache duration is 24 hours', () => {
    expect(awardDefinitions.cacheDuration).toBe(24 * 60 * 60 * 1000)
  })

  test('getCacheStats includes new fields', async () => {
    initializeService({
      sanityConfig: { token: 'test', projectId: 'test', dataset: 'test', version: 'v1' },
      railcontentConfig: { token: 'test', userId: '1', baseUrl: 'http://test.com', authToken: 'test' },
      localStorage: mockLocalStorage,
      isMA: false
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    const stats = awardDefinitions.getCacheStats()

    expect(stats).toHaveProperty('initialized', true)
    expect(stats).toHaveProperty('cacheDuration', 24 * 60 * 60 * 1000)
    expect(stats).toHaveProperty('lastFetch')
    expect(stats).toHaveProperty('totalDefinitions')
  })
})
