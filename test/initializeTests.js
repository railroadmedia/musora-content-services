import { globalConfig, initializeService } from '../src'
import { LocalStorageMock } from './localStorageMock'
const railContentModule = require('../src/services/railcontent.js')
let token = null
let userId = process.env.RAILCONTENT_USER_ID ?? null

export async function initializeTestService(useLive = false, isAdmin = false) {
  let token, userId
  if (useLive && !token && process.env.RAILCONTENT_BASE_URL) {
    const baseUrl = `${process.env.RAILCONTENT_BASE_URL}/api/user-management-system`
    const response = await fetch(`${baseUrl}/v1/sessions`, {
      method: 'POST',
      headers: {
        'X-Client-Platform': 'mobile',
        'Content-Type': 'application/json',
        Authorization: null,
      },
      body: JSON.stringify({
        email: process.env.RAILCONTENT_EMAIL,
        password: process.env.RAILCONTENT_PASSWORD,
        device_name: 'test',
        device_token: '',
        platform: '',
      }),
    })

    let data = await response.json() // Parse the JSON body
    token = data['token']
    userId = data['user']['id']
  }

  const config = {
    sanityConfig: {
      token: process.env.SANITY_API_TOKEN,
      projectId: process.env.SANITY_PROJECT_ID,
      dataset: process.env.SANITY_DATASET,
      useCachedAPI: process.env.SANITY_USE_CACHED_API === 'true' || true,
      version: '2021-06-07',
      debug: process.env.DEBUG === 'true' || false,
      useDummyRailContentMethods: true,
    },
    railcontentConfig: {
      baseUrl: process.env.RAILCONTENT_BASE_URL || 'https://test.musora.com',
      token: token,
      userId: userId,
      authToken: token
    },
    sessionConfig: { token: token, userId: userId, authToken: token },
    baseUrl: process.env.RAILCONTENT_BASE_URL,
    localStorage: new LocalStorageMock(),
    isMA: true,
  }
  initializeService(config)
  let mock = jest.spyOn(railContentModule, 'fetchUserPermissionsData')
  let testData = { permissions: [78, 91, 92], isAdmin: isAdmin }
  mock.mockImplementation(() => testData)
}
