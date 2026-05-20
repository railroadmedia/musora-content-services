import { SanityClient } from '../../../../src/infrastructure/sanity/SanityClient'
import { ConfigProvider } from '../../../../src/infrastructure/sanity/interfaces/ConfigProvider'
import { QueryExecutor } from '../../../../src/infrastructure/sanity/interfaces/QueryExecutor'
import { SanityConfig } from '../../../../src/infrastructure/sanity/interfaces/SanityConfig'

describe('SanityClient', () => {
  const config: SanityConfig = {
    projectId: 'p',
    dataset: 'd',
    version: '2021-06-07',
    token: 't',
  }
  let mockConfigProvider: jest.Mocked<ConfigProvider>
  let mockExecutor: jest.Mocked<QueryExecutor>
  let client: SanityClient

  beforeEach(() => {
    mockConfigProvider = {
      getConfig: jest.fn().mockReturnValue(config),
    }
    mockExecutor = {
      execute: jest.fn(),
    }
    client = new SanityClient(mockConfigProvider, mockExecutor)
  })

  describe('fetchSingle', () => {
    test('returns first item from result array', async () => {
      mockExecutor.execute.mockResolvedValue({
        result: [{ id: 1 }, { id: 2 }],
        ms: 5,
        query: 'q',
      })
      const result = await client.fetchSingle<{ id: number }>('*[_type=="x"]', { a: 1 })
      expect(result).toEqual({ id: 1 })
      expect(mockExecutor.execute).toHaveBeenCalledWith(
        { query: '*[_type=="x"]', params: { a: 1 } },
        config
      )
    })

    test('returns null when result array is empty', async () => {
      mockExecutor.execute.mockResolvedValue({ result: [], ms: 1, query: 'q' })
      expect(await client.fetchSingle('q')).toBeNull()
    })

    test('returns null when result is not an array', async () => {
      mockExecutor.execute.mockResolvedValue({ result: { id: 1 } as any, ms: 1, query: 'q' })
      expect(await client.fetchSingle('q')).toBeNull()
    })

    test('rethrows SanityError unchanged and returns nothing useful', async () => {
      const sanityError = { message: 'boom', query: 'q' }
      mockExecutor.execute.mockRejectedValue(sanityError)
      await expect(client.fetchSingle('q')).rejects.toEqual(sanityError)
    })

    test('wraps non-SanityError as SanityError including query and originalError', async () => {
      const raw = new Error('network down')
      mockExecutor.execute.mockRejectedValue(raw)
      await expect(client.fetchSingle('myquery')).rejects.toMatchObject({
        message: 'network down',
        query: 'myquery',
        originalError: raw,
      })
    })
  })

  describe('fetchList', () => {
    test('returns result array', async () => {
      const data = [{ id: 1 }, { id: 2 }]
      mockExecutor.execute.mockResolvedValue({ result: data, ms: 1, query: 'q' })
      const result = await client.fetchList('q')
      expect(result).toEqual(data)
    })

    test('returns empty array when result is null/undefined', async () => {
      mockExecutor.execute.mockResolvedValue({ result: null as any, ms: 1, query: 'q' })
      expect(await client.fetchList('q')).toEqual([])
    })

    test('rethrows existing SanityError', async () => {
      const sanityError = { message: 'boom', query: 'q' }
      mockExecutor.execute.mockRejectedValue(sanityError)
      await expect(client.fetchList('q')).rejects.toEqual(sanityError)
    })

    test('wraps non-SanityError as SanityError', async () => {
      mockExecutor.execute.mockRejectedValue(new Error('fail'))
      await expect(client.fetchList('q')).rejects.toMatchObject({
        message: 'fail',
        query: 'q',
      })
    })
  })

  describe('executeQuery', () => {
    test('returns the raw result', async () => {
      mockExecutor.execute.mockResolvedValue({ result: { count: 7 }, ms: 1, query: 'q' })
      const result = await client.executeQuery<{ count: number }>('q')
      expect(result).toEqual({ count: 7 })
    })

    test('returns null when result is missing', async () => {
      mockExecutor.execute.mockResolvedValue({ result: null as any, ms: 1, query: 'q' })
      expect(await client.executeQuery('q')).toBeNull()
    })

    test('rethrows wrapped error on failure', async () => {
      mockExecutor.execute.mockRejectedValue(new Error('explode'))
      await expect(client.executeQuery('q')).rejects.toMatchObject({
        message: 'explode',
        query: 'q',
      })
    })
  })

  describe('config caching', () => {
    test('loads config once across multiple calls', async () => {
      mockExecutor.execute.mockResolvedValue({ result: [], ms: 1, query: 'q' })
      await client.fetchList('q1')
      await client.fetchList('q2')
      await client.fetchSingle('q3')
      expect(mockConfigProvider.getConfig).toHaveBeenCalledTimes(1)
    })

    test('refreshConfig forces a reload on the next call', async () => {
      mockExecutor.execute.mockResolvedValue({ result: [], ms: 1, query: 'q' })
      await client.fetchList('q1')
      client.refreshConfig()
      await client.fetchList('q2')
      expect(mockConfigProvider.getConfig).toHaveBeenCalledTimes(2)
    })
  })

  test('falls back to default providers when none are supplied', () => {
    const defaultClient = new SanityClient()
    expect(defaultClient).toBeInstanceOf(SanityClient)
  })
})
