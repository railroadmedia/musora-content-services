import { fetchSimilarItems } from '../../src/services/recommendations.js'

jest.mock('../../src/infrastructure/http/HttpClient.ts', () => {
  const mockPost = jest.fn()
  const MockHttpClient = jest.fn().mockImplementation(() => ({ post: mockPost }))
  MockHttpClient._mockPost = mockPost
  return { HttpClient: MockHttpClient, GET: jest.fn() }
})

const mockPost = () => require('../../src/infrastructure/http/HttpClient.ts').HttpClient._mockPost

describe('fetchSimilarItems', () => {
  beforeEach(() => {
    mockPost().mockReset()
  })

  test('returns empty array when content_id is falsy', async () => {
    expect(await fetchSimilarItems(null, 'drumeo')).toEqual([])
    expect(await fetchSimilarItems(0, 'drumeo')).toEqual([])
    expect(await fetchSimilarItems('', 'drumeo')).toEqual([])
  })

  test('parses string content_id to integer for filtering', async () => {
    mockPost().mockResolvedValue({ similar_items: [42, 99] })
    const result = await fetchSimilarItems('42', 'drumeo', 10)
    expect(result).not.toContain(42)
    expect(result).toEqual([99])
  })

  test('filters out the requested content_id from results', async () => {
    mockPost().mockResolvedValue({ similar_items: [1, 2, 3] })
    const result = await fetchSimilarItems(2, 'drumeo', 10)
    expect(result).toEqual([1, 3])
  })

  test('respects count limit', async () => {
    mockPost().mockResolvedValue({ similar_items: [10, 20, 30, 40, 50, 60] })
    const result = await fetchSimilarItems(99, 'drumeo', 3)
    expect(result).toHaveLength(3)
  })

  test('returns null on error', async () => {
    mockPost().mockRejectedValue(new Error('network failure'))
    const result = await fetchSimilarItems(1, 'drumeo')
    expect(result).toBeNull()
  })
})
