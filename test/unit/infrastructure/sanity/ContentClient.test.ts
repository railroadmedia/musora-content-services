import { ContentClient } from '../../../../src/infrastructure/sanity/clients/ContentClient'
import { ConfigProvider } from '../../../../src/infrastructure/sanity/interfaces/ConfigProvider'
import { QueryExecutor } from '../../../../src/infrastructure/sanity/interfaces/QueryExecutor'
import { SanityConfig } from '../../../../src/infrastructure/sanity/interfaces/SanityConfig'
import { SanityQuery } from '../../../../src/infrastructure/sanity/interfaces/SanityQuery'
import { SanityResponse } from '../../../../src/infrastructure/sanity/interfaces/SanityResponse'

describe('ContentClient', () => {
  const config: SanityConfig = {
    projectId: 'p',
    dataset: 'd',
    version: '2021-06-07',
    token: 't',
  }
  let mockConfigProvider: jest.Mocked<ConfigProvider>
  let mockExecutor: jest.Mocked<QueryExecutor>
  let client: ContentClient
  let capturedQueries: string[]

  beforeEach(() => {
    capturedQueries = []
    mockConfigProvider = { getConfig: jest.fn().mockReturnValue(config) }
    mockExecutor = {
      execute: jest.fn().mockImplementation((q: SanityQuery) => {
        capturedQueries.push(q.query)
        return Promise.resolve({ result: [], ms: 1, query: q.query } as SanityResponse<any>)
      }),
    }
    client = new ContentClient(mockConfigProvider, mockExecutor)
  })

  describe('fetchById', () => {
    test('builds query with railcontent_id, _type and [0] suffix', async () => {
      mockExecutor.execute.mockResolvedValueOnce({
        result: [{ id: 42, title: 'Song' }],
        ms: 1,
        query: '',
      } as any)
      const result = await client.fetchById<{ id: number; title: string }>({
        type: 'song',
        id: 42,
      })

      expect(result).toEqual({ id: 42, title: 'Song' })
      const q = mockExecutor.execute.mock.calls[0][0].query
      expect(q).toContain('railcontent_id == 42')
      expect(q).toContain("_type == 'song'")
      expect(q).toContain("'id': railcontent_id")
      expect(q.trim().endsWith('[0]')).toBe(true)
    })

    test('uses custom fields when provided', async () => {
      mockExecutor.execute.mockResolvedValueOnce({ result: [{}], ms: 1, query: '' } as any)
      await client.fetchById({
        type: 'song',
        id: 1,
        fields: ['title', 'artist'],
      })
      const q = mockExecutor.execute.mock.calls[0][0].query
      expect(q).toContain('{title,\n    artist}')
      expect(q).not.toContain("'thumbnail'")
    })

    test('adds children fields when includeChildren is true', async () => {
      mockExecutor.execute.mockResolvedValueOnce({ result: [{}], ms: 1, query: '' } as any)
      await client.fetchById({
        type: 'course',
        id: 1,
        includeChildren: true,
      })
      const q = mockExecutor.execute.mock.calls[0][0].query
      expect(q).toContain('child_count')
      expect(q).toContain('"lessons": child[]->{')
    })

    test('returns null when nothing matches', async () => {
      mockExecutor.execute.mockResolvedValueOnce({ result: [], ms: 1, query: '' } as any)
      const result = await client.fetchById({ type: 'song', id: 999 })
      expect(result).toBeNull()
    })
  })

  describe('fetchByIds', () => {
    test('returns empty array immediately when no ids supplied', async () => {
      const result = await client.fetchByIds([])
      expect(result).toEqual([])
      expect(mockExecutor.execute).not.toHaveBeenCalled()
    })

    test('builds query with id list and optional type/brand filters', async () => {
      mockExecutor.execute.mockResolvedValueOnce({ result: [], ms: 1, query: '' } as any)
      await client.fetchByIds([1, 2, 3], 'song', 'drumeo')
      const q = mockExecutor.execute.mock.calls[0][0].query
      expect(q).toContain('railcontent_id in [1,2,3]')
      expect(q).toContain("_type == 'song'")
      expect(q).toContain('brand == "drumeo"')
    })

    test('omits type and brand filters when not provided', async () => {
      mockExecutor.execute.mockResolvedValueOnce({ result: [], ms: 1, query: '' } as any)
      await client.fetchByIds([10, 20])
      const q = mockExecutor.execute.mock.calls[0][0].query
      expect(q).toContain('railcontent_id in [10,20]')
      expect(q).not.toContain('_type ==')
      expect(q).not.toContain('brand ==')
    })

    test('sorts results to match input id order', async () => {
      mockExecutor.execute.mockResolvedValueOnce({
        result: [{ id: 3 }, { id: 1 }, { id: 2 }],
        ms: 1,
        query: '',
      } as any)
      const result = await client.fetchByIds<{ id: number }>([1, 2, 3])
      expect(result.map((r) => r.id)).toEqual([1, 2, 3])
    })

    test('sorts by railcontent_id when id field is absent', async () => {
      mockExecutor.execute.mockResolvedValueOnce({
        result: [{ railcontent_id: 2 }, { railcontent_id: 1 }],
        ms: 1,
        query: '',
      } as any)
      const result = await client.fetchByIds<{ railcontent_id: number }>([1, 2])
      expect(result.map((r) => r.railcontent_id)).toEqual([1, 2])
    })
  })

  describe('fetchByBrandAndType', () => {
    test('applies default limit, offset, sort', async () => {
      mockExecutor.execute.mockResolvedValueOnce({ result: [], ms: 1, query: '' } as any)
      await client.fetchByBrandAndType('drumeo', 'song')
      const q = mockExecutor.execute.mock.calls[0][0].query
      expect(q).toContain('brand == "drumeo"')
      expect(q).toContain('_type == "song"')
      expect(q).toContain('order(published_on desc)')
      expect(q).toContain('[0...10]')
    })

    test('honours custom limit, offset, sort, fields', async () => {
      mockExecutor.execute.mockResolvedValueOnce({ result: [], ms: 1, query: '' } as any)
      await client.fetchByBrandAndType('pianote', 'course', {
        limit: 5,
        offset: 20,
        sortBy: 'title asc',
        fields: ['title'],
      })
      const q = mockExecutor.execute.mock.calls[0][0].query
      expect(q).toContain('order(title asc)')
      expect(q).toContain('[20...25]')
      expect(q).toContain('{title}')
    })

    test('returns list from executor', async () => {
      const items = [{ id: 1 }, { id: 2 }]
      mockExecutor.execute.mockResolvedValueOnce({ result: items, ms: 1, query: '' } as any)
      const result = await client.fetchByBrandAndType<{ id: number }>('drumeo', 'song')
      expect(result).toEqual(items)
    })

    test('rethrows wrapped SanityError on executor failure', async () => {
      mockExecutor.execute.mockRejectedValueOnce(new Error('boom'))
      await expect(client.fetchByBrandAndType('drumeo', 'song')).rejects.toMatchObject({
        message: 'boom',
      })
    })
  })
})
