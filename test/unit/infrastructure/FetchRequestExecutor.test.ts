import { FetchRequestExecutor } from '../../../src/infrastructure/http'
describe('FetchRequestExecutor', () => {
  let executor: FetchRequestExecutor
  beforeEach(() => {
    executor = new FetchRequestExecutor()
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })
  describe('successful responses', () => {
    test('returns parsed JSON when content-type is application/json', async () => {
      const mockData = { id: 1, name: 'test' }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: jest.fn().mockReturnValue('application/json') },
        json: jest.fn().mockResolvedValue(mockData),
        text: jest.fn(),
      })
      const result = await executor.execute('https://api.example.com/test', { method: 'GET', headers: {} })
      expect(result).toEqual(mockData)
    })
    test('returns text when content-type is not application/json', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: { get: jest.fn().mockReturnValue('text/plain') },
        json: jest.fn(),
        text: jest.fn().mockResolvedValue('plain text response'),
      })
      const result = await executor.execute('https://api.example.com/test', { method: 'GET', headers: {} })
      expect(result).toBe('plain text response')
    })
  })
  describe('error responses', () => {
    test('throws HttpError with correct shape when response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: { get: jest.fn().mockReturnValue('application/json') },
        json: jest.fn().mockResolvedValue({ message: 'not found' }),
        text: jest.fn(),
      })
      await expect(
        executor.execute('https://api.example.com/test', { method: 'GET', headers: {} })
      ).rejects.toMatchObject({
        status: 404,
        statusText: 'Not Found',
        url: 'https://api.example.com/test',
        method: 'GET',
        body: { message: 'not found' },
      })
    })
    test('error body is parsed as JSON when response body is valid JSON', async () => {
      const errorBody = { message: 'validation failed', code: 422 }
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: { get: jest.fn() },
        json: jest.fn().mockResolvedValue(errorBody),
        text: jest.fn(),
      })
      await expect(
        executor.execute('https://api.example.com/test', { method: 'POST', headers: {} })
      ).rejects.toMatchObject({
        body: errorBody,
      })
    })
    test('error body falls back to text when response body is not JSON', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: jest.fn() },
        json: jest.fn().mockRejectedValue(new Error('invalid json')),
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      })
      await expect(
        executor.execute('https://api.example.com/test', { method: 'GET', headers: {} })
      ).rejects.toMatchObject({
        body: 'Internal Server Error',
      })
    })
  })
})



