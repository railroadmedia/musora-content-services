import { Either } from '../src/core/types/ads/either'
import { HttpClient } from '../src/infrastructure/http/HttpClient'
import { HeaderProvider } from '../src/infrastructure/http/interfaces/HeaderProvider'
import { RequestExecutor } from '../src/infrastructure/http/interfaces/RequestExecutor'

describe('HttpClient', () => {
  /** @var {HttpClient} httpClient */
  let httpClient
  let mockHeaderProvider
  let mockRequestExecutor
  const baseUrl = 'https://api.example.com'
  const token = 'test-token'
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  const responseData = { success: true }

  beforeEach(() => {
    // Mock HeaderProvider
    mockHeaderProvider = {
      getHeaders: jest.fn().mockReturnValue(headers),
    }

    // Mock RequestExecutor
    mockRequestExecutor = {
      execute: jest.fn().mockResolvedValue(responseData),
    }

    // Create HttpClient instance with mocks
    httpClient = new HttpClient(baseUrl, token, mockHeaderProvider, mockRequestExecutor)
  })

  describe('Constructor', () => {
    test('should initialize with default parameters when not provided', () => {
      const client = new HttpClient(baseUrl)
      expect(client).toBeInstanceOf(HttpClient)
    })

    test('should initialize with provided parameters', () => {
      expect(httpClient).toBeInstanceOf(HttpClient)
    })
  })

  describe('setToken', () => {
    test('should update the token', () => {
      const newToken = 'new-test-token'
      httpClient.setToken(newToken)

      // Verify token was updated by making a request and checking if the new token is used
      httpClient.get('/test')

      expect(mockRequestExecutor.execute).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${newToken}`,
          }),
        })
      )
    })
  })

  describe('HTTP Methods', () => {
    test('get should make a GET request', async () => {
      const url = '/test'
      await httpClient.get(url)

      expect(mockHeaderProvider.getHeaders).toHaveBeenCalled()
      expect(mockRequestExecutor.execute).toHaveBeenCalledWith(
        `${baseUrl}${url}`,
        expect.objectContaining({
          method: 'get',
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
        })
      )
    })

    test('post should make a POST request with data', async () => {
      const url = '/test'
      const data = { name: 'test' }
      await httpClient.post(url, data)

      expect(mockHeaderProvider.getHeaders).toHaveBeenCalled()
      expect(mockRequestExecutor.execute).toHaveBeenCalledWith(
        `${baseUrl}${url}`,
        expect.objectContaining({
          method: 'post',
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
          body: JSON.stringify(data),
        })
      )
    })

    test('put should make a PUT request with data', async () => {
      const url = '/test'
      const data = { name: 'test' }
      await httpClient.put(url, data)

      expect(mockHeaderProvider.getHeaders).toHaveBeenCalled()
      expect(mockRequestExecutor.execute).toHaveBeenCalledWith(
        `${baseUrl}${url}`,
        expect.objectContaining({
          method: 'put',
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
          body: JSON.stringify(data),
        })
      )
    })

    test('patch should make a PATCH request with data', async () => {
      const url = '/test'
      const data = { name: 'test' }
      await httpClient.patch(url, data)

      expect(mockHeaderProvider.getHeaders).toHaveBeenCalled()
      expect(mockRequestExecutor.execute).toHaveBeenCalledWith(
        `${baseUrl}${url}`,
        expect.objectContaining({
          method: 'patch',
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
          body: JSON.stringify(data),
        })
      )
    })

    test('delete should make a DELETE request', async () => {
      const url = '/test'
      await httpClient.delete(url)

      expect(mockHeaderProvider.getHeaders).toHaveBeenCalled()
      expect(mockRequestExecutor.execute).toHaveBeenCalledWith(
        `${baseUrl}${url}`,
        expect.objectContaining({
          method: 'delete',
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
        })
      )
    })
  })

  describe('URL Resolution', () => {
    test('should prepend baseUrl to relative URLs', async () => {
      const relativeUrl = '/api/endpoint'
      await httpClient.get(relativeUrl)

      expect(mockRequestExecutor.execute).toHaveBeenCalledWith(
        `${baseUrl}${relativeUrl}`,
        expect.anything()
      )
    })

    test('should not modify absolute URLs', async () => {
      const absoluteUrl = 'https://another-api.example.com/endpoint'
      await httpClient.get(absoluteUrl)

      expect(mockRequestExecutor.execute).toHaveBeenCalledWith(absoluteUrl, expect.anything())
    })
  })

  describe('Data Version Header', () => {
    beforeEach(() => {
      // Reset all mocks and create a fresh HttpClient for each test
      jest.resetAllMocks()
      mockHeaderProvider = {
        getHeaders: jest.fn().mockReturnValue({ ...headers }),
      }
      mockRequestExecutor = {
        execute: jest.fn().mockResolvedValue(responseData),
      }
      httpClient = new HttpClient(baseUrl, token, mockHeaderProvider, mockRequestExecutor)
    })

    test('should add Data-Version header when provided', async () => {
      const url = '/test'
      const dataVersion = '1.2.3'

      await httpClient.get(url, dataVersion)

      // Check the actual calls that were made
      expect(mockRequestExecutor.execute.mock.calls.length).toBe(1)

      const requestOptions = mockRequestExecutor.execute.mock.calls[0][1]
      expect(requestOptions.headers['Data-Version']).toBe(dataVersion)
    })

    test('should not add Data-Version header when not provided', async () => {
      // Log what's happening for debugging
      console.log('Starting test: should not add Data-Version header when not provided')

      const url = '/test'

      // Make sure we're using exact null here, not undefined
      const dataVersion = null

      // Create separate mocks for this test to avoid state bleeding
      const testHeaderProvider = {
        getHeaders: jest.fn().mockReturnValue({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
      }

      const testRequestExecutor = {
        execute: jest.fn().mockResolvedValue(responseData),
      }

      // Create a completely fresh HttpClient instance
      const testClient = new HttpClient(baseUrl, token, testHeaderProvider, testRequestExecutor)

      await testClient.get(url, dataVersion)

      console.log('Headers used in request:', testRequestExecutor.execute.mock.calls[0][1].headers)

      // Direct check on the mock to validate Data-Version absence
      const actualHeaders = testRequestExecutor.execute.mock.calls[0][1].headers
      const hasDataVersion = Object.prototype.hasOwnProperty.call(actualHeaders, 'Data-Version')
      expect(hasDataVersion).toBe(false)
    })
  })

  describe('Error Handling', () => {
    test('should properly handle HTTP errors', async () => {
      const httpError = {
        status: 404,
        statusText: 'Not Found',
        body: { message: 'Resource not found' },
        url: `${baseUrl}/test`,
        method: 'get',
      }

      mockRequestExecutor.execute.mockResolvedValueOnce(httpError)

      await expect(httpClient.get('/test').then((r) => r.drop())).resolves.toEqual(httpError)
    })

    test('should properly handle network errors', async () => {
      const networkError = new Error('Network error')

      mockRequestExecutor.execute.mockImplementationOnce(() => {
        throw networkError
      })

      await expect(httpClient.get('/test')).rejects.toMatchObject({
        message: 'Network error',
        url: '/test',
        method: 'get',
        originalError: networkError,
      })
    })
  })
})
