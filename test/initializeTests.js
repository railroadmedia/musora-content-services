import { globalConfig, initializeService } from '../src'
import { LocalStorageMock } from './localStorageMock'
import { clearPermissionsData } from '../src/services/userPermissions.js'

const railContentModule = require('../src/services/railcontent.js')
let token = null
let userId = null

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
      baseUrl: process.env.RAILCONTENT_BASE_URL,
      userId: userId,
      authToken: token,
    },
    localStorage: new LocalStorageMock(),
  }
  initializeService(config)

  let mock = jest.spyOn(railContentModule, 'fetchUserPermissionsData')
  let testData = { permissions: [78, 91, 92], isAdmin: false }
  mock.mockImplementation(() => testData)
  clearPermissionsData()
}

async function fetchLoginToken(email, password) {
  try {
    const url = `${process.env.RAILCONTENT_BASE_URL}/user-management-system/login/token`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email, password: password, device_name: 'test' }),
    })
    if (response.ok) {
      let data = await response.json()
      return { token: data.token, userId: data.user.id }
    } else {
      console.log('fetch error:', response.status)
      console.log(response)
    }
  } catch (error) {
    console.error('Fetch error:', error)
  }
  return null
}
