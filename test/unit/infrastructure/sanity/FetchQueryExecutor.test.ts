import { FetchQueryExecutor } from '../../../../src/infrastructure/sanity/executors/FetchQueryExecutor'
import { SanityConfig } from '../../../../src/infrastructure/sanity/interfaces/SanityConfig'

describe('FetchQueryExecutor', () => {
  const baseConfig: SanityConfig = {
    projectId: 'proj',
    dataset: 'prod',
    version: '2021-06-07',
    token: 'tok',
  }

  let fetchMock: jest.Mock
  const originalFetch = global.fetch

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as any
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  function makeResponse(body: any, ok = true, status = 200, statusText = 'OK'): Response {
    return {
      ok,
      status,
      statusText,
      json: async () => body,
    } as any
  }

  test('posts to non-cached endpoint with default published perspective', async () => {
    fetchMock.mockResolvedValue(makeResponse({ result: [], ms: 1, query: 'q' }))
    const executor = new FetchQueryExecutor()
    await executor.execute({ query: 'q', params: { a: 1 } }, baseConfig)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(
      'https://proj.api.sanity.io/v2021-06-07/data/query/prod?perspective=published'
    )
    expect(options.method).toBe('POST')
    expect(options.headers['Authorization']).toBe('Bearer tok')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.body).toBe(JSON.stringify({ query: 'q', params: { a: 1 } }))
  })

  test('uses apicdn endpoint when useCachedAPI is true', async () => {
    fetchMock.mockResolvedValue(makeResponse({ result: [] }))
    const executor = new FetchQueryExecutor()
    await executor.execute({ query: 'q' }, { ...baseConfig, useCachedAPI: true })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://proj.apicdn.sanity.io/v2021-06-07/data/query/prod?perspective=published&query=q'
    )
  })

  test('uses GET with encoded query when no params and URL under length limit', async () => {
    fetchMock.mockResolvedValue(makeResponse({ result: [] }))
    const executor = new FetchQueryExecutor()
    await executor.execute({ query: '*[_type == "foo"]' }, baseConfig)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(
      'https://proj.api.sanity.io/v2021-06-07/data/query/prod?perspective=published&query=' +
        encodeURIComponent('*[_type == "foo"]')
    )
    expect(options.method).toBe('GET')
    expect(options.headers['Authorization']).toBe('Bearer tok')
    expect(options.body).toBeUndefined()
  })

  test('falls back to POST when params are provided', async () => {
    fetchMock.mockResolvedValue(makeResponse({ result: [] }))
    const executor = new FetchQueryExecutor()
    await executor.execute({ query: 'q', params: { id: 1 } }, baseConfig)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(
      'https://proj.api.sanity.io/v2021-06-07/data/query/prod?perspective=published'
    )
    expect(options.method).toBe('POST')
    expect(options.body).toBe(JSON.stringify({ query: 'q', params: { id: 1 } }))
  })

  test('falls back to POST when GET URL would exceed length limit', async () => {
    fetchMock.mockResolvedValue(makeResponse({ result: [] }))
    const executor = new FetchQueryExecutor()
    const longQuery = 'a'.repeat(8001)
    await executor.execute({ query: longQuery }, baseConfig)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(
      'https://proj.api.sanity.io/v2021-06-07/data/query/prod?perspective=published'
    )
    expect(options.method).toBe('POST')
    expect(options.body).toBe(JSON.stringify({ query: longQuery }))
  })

  test('honours custom perspective', async () => {
    fetchMock.mockResolvedValue(makeResponse({ result: [] }))
    const executor = new FetchQueryExecutor()
    await executor.execute({ query: 'q' }, { ...baseConfig, perspective: 'previewDrafts' })

    expect(fetchMock.mock.calls[0][0]).toContain('perspective=previewDrafts')
  })

  test('returns parsed response body on success', async () => {
    const body = { result: [{ id: 1 }], ms: 4, query: 'q' }
    fetchMock.mockResolvedValue(makeResponse(body))
    const executor = new FetchQueryExecutor()
    const out = await executor.execute({ query: 'q' }, baseConfig)
    expect(out).toEqual(body)
  })

  test('throws SanityError using response body message when fetch is not ok', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ message: 'GROQ parse error' }, false, 400, 'Bad Request')
    )
    const executor = new FetchQueryExecutor()
    await expect(executor.execute({ query: 'q', params: { a: 1 } }, baseConfig)).rejects.toMatchObject({
      message: 'GROQ parse error',
      query: 'q',
      params: { a: 1 },
    })
  })

  test('falls back to status/statusText when error body cannot be parsed', async () => {
    const response = {
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => {
        throw new Error('not json')
      },
    } as any
    fetchMock.mockResolvedValue(response)
    const executor = new FetchQueryExecutor()
    await expect(executor.execute({ query: 'q' }, baseConfig)).rejects.toMatchObject({
      message: 'Sanity API error: 500 - Server Error',
      query: 'q',
    })
  })

  test('wraps thrown network errors as SanityError', async () => {
    const networkErr = new Error('connection refused')
    fetchMock.mockRejectedValue(networkErr)
    const executor = new FetchQueryExecutor()
    await expect(executor.execute({ query: 'q' }, baseConfig)).rejects.toMatchObject({
      message: 'connection refused',
      query: 'q',
      originalError: networkErr,
    })
  })

  test('does not re-wrap an existing SanityError', async () => {
    const sanityErr = { message: 'already wrapped', query: 'q' }
    fetchMock.mockRejectedValue(sanityErr)
    const executor = new FetchQueryExecutor()
    await expect(executor.execute({ query: 'q' }, baseConfig)).rejects.toEqual(sanityErr)
  })

  test('debug mode logs query and result', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const body = { result: [], ms: 1, query: 'q' }
    fetchMock.mockResolvedValue(makeResponse(body))
    const executor = new FetchQueryExecutor()
    await executor.execute({ query: 'dbg' }, { ...baseConfig, debug: true })
    expect(logSpy).toHaveBeenCalledWith('Sanity Query:', 'dbg')
    expect(logSpy).toHaveBeenCalledWith('Sanity Results:', body)
    logSpy.mockRestore()
  })
})
