import { initializeService } from '../src'
import { login } from '../src/services/user/sessions.js'
import { LocalStorageMock } from './localStorageMock'

const railContentModule = require('../src/services/railcontent.js')
let token = null
let userId = process.env.RAILCONTENT_USER_ID ?? null

export async function initializeTestService(useLive = false) {
  if (useLive && !token && process.env.RAILCONTENT_BASE_URL) {
    let data = await fetchLoginToken(
      process.env.RAILCONTENT_EMAIL,
      process.env.RAILCONTENT_PASSWORD
    )
    token = data['token']
    userId = data['userId']
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
      userId: userId,
      authToken: token,
      token: token,
      baseUrl: process.env.RAILCONTENT_BASE_URL,
    },
    sessionConfig: {
      userId: userId,
      token: token,
      authToken: token,
    },
    baseUrl: process.env.RAILCONTENT_BASE_URL,
    localStorage: new LocalStorageMock(),
    isMA: true,
    recommendationsConfig: {
      token: process.env.HUGGINGFACE_TOKEN,
      baseUrl: process.env.HUGGINGFACE_URL,
    },
  }
  initializeService(config)

  let mock = jest.spyOn(railContentModule, 'fetchUserPermissionsData')
  let testData = { permissions: [78, 91, 92], isAdmin: false }
  mock.mockImplementation(() => testData)
}

async function fetchLoginToken(email, password) {
  try {
    const data = await login(email, password, 'test')
    return { token: data.token, userId: data.user.id }
  } catch (error) {
    console.error('Fetch error:', error)
  }
  return null
}
