import { initializeTestService } from '../../initializeTests.js'
import { fetchSanity } from '../../../src/services/sanity.js'

jest.mock('../../../src/services/permissions/index.ts', () => ({
  ...jest.requireActual('../../../src/services/permissions/index.ts'),
  getPermissionsAdapter: jest.fn().mockReturnValue({
    fetchUserPermissions: jest.fn().mockResolvedValue({ permissions: [], isAdmin: false }),
  }),
}))

const query = '*[railcontent_id == 1]{railcontent_id}'
const options = { processNeedAccess: false }

describe('fetchSanity', () => {
  beforeEach(() => {
    process.env.SANITY_API_TOKEN = 'test-token'
    process.env.SANITY_PROJECT_ID = 'test-project'
    process.env.SANITY_DATASET = 'test'
    initializeTestService()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  test('resolves null on a failed request by default', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as any
    expect(await fetchSanity(query, false, options)).toBeNull()
  })

  test('rejects on a failed request with throwOnError', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as any
    await expect(fetchSanity(query, false, { ...options, throwOnError: true })).rejects.toThrow(
      'Network request failed'
    )
  })

  test('rejects on an error status with throwOnError', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 0, statusText: '' })) as any
    await expect(fetchSanity(query, false, { ...options, throwOnError: true })).rejects.toThrow(
      'Sanity API error'
    )
  })

  test('rejects on a response without a result with throwOnError', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    ) as any
    await expect(fetchSanity(query, false, { ...options, throwOnError: true })).rejects.toThrow()
  })

  test('resolves null on an empty result with throwOnError', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ result: [] }) })
    ) as any
    expect(await fetchSanity(query, false, { ...options, throwOnError: true })).toBeNull()
  })
})
