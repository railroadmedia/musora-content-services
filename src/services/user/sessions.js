/**
 * @module Sessions
 */
import { globalConfig } from '../config.js'
import { USER_PIN_PROGRESS_KEY } from '../progress-row/base.js'
import './types.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

/**
 * Authenticates the User.
 *
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string|null} deviceName -  Device name for the user
 * @param {string|null} deviceToken - Firebase token for the device
 * @param {string|null} platform - Device platform
 *
 * @returns {Promise<AuthResponse>} - User data and authentication token
 *
 * @example
 * login('john@doe.com', 'music123')
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 */
export async function login(email, password, deviceName, deviceToken, platform) {
  const baseUrl = `${globalConfig.baseUrl}/api/user-management-system`
  const res = await fetch(`${baseUrl}/v1/sessions`, {
    method: 'POST',
    headers: {
      'X-Client-Platform': globalConfig.isMA ? 'mobile' : 'web',
      'Content-Type': 'application/json',
      Authorization: null,
    },
    body: JSON.stringify({
      email: email,
      password: password,
      device_name: deviceName,
      device_token: deviceToken,
      platform: platform,
    }),
  })

  const data = await res.json()

  // TODO: refactor this. I don't think this is the place for it but we need it fixed for the system test
  if (res.ok) {
    globalConfig.localStorage.setItem(
      USER_PIN_PROGRESS_KEY,
      JSON.stringify(data.pinned_progress_rows || {})
    )
  }

  return data
}
//Removing 3rdParty OAuth2 for now => https://musora.atlassian.net/browse/BEH-624?focusedCommentId=21492
/*export async function loginWithProvider(provider, providerIdToken, deviceToken, deviceName, platform) {
  const baseUrl = `${globalConfig.baseUrl}/api/user-management-system`

  try {
    const response = await fetch(`${baseUrl}/v1/auth/${provider}/mobile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Platform': 'mobile',
      },
      body: JSON.stringify({
        id_token: providerIdToken,
        device_name: deviceName,
        firebase_token: deviceToken,
        platform,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      throw new Error(errorBody.error || `Login failed with status ${response.status}`)
    }

    return await response.json()
  } catch (err) {
    console.error('loginWithProvider failed', err)
    throw err
  }
}*/

/**
 * Logs the user out of the current session.
 *
 * @returns {Promise<void>}
 *
 * @example
 * logout()
 *   .then()
 *   .catch(error => console.error(error));
 */
export async function logout() {
  const baseUrl = `${globalConfig.baseUrl}/api/user-management-system`
  await fetch(`${baseUrl}/v1/sessions`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${globalConfig.sessionConfig.authToken}`,
      'Content-Type': 'application/json',
    },
  })
}

/**
 * @param {number} userId
 * @param {string} redirectTo
 * @returns {Promise<string>}
 *
 * @example
 * const authUrl = await generateAuthSessionUrl(592656, 'https://app.musora.com/drumeo')
 */
export async function generateAuthSessionUrl(userId, redirectTo) {
  const baseUrl = `${globalConfig.baseUrl}/api/user-management-system`

  const headers = {
    'Content-Type': 'application/json',
  }

  if (globalConfig.isMA) {
    headers.Authorization = `Bearer ${globalConfig.sessionConfig.authToken}`
  }

  const response = await fetch(`${baseUrl}/v1/auth-key`, {
    method: 'GET',
    headers,
    credentials: globalConfig.isMA ? undefined : 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to generate auth key: ${response.status}`)
  }

  const authKeyResponse = await response.json()
  const authKey = authKeyResponse.data || authKeyResponse.auth_key

  const params = new URLSearchParams({
    user_id: userId.toString(),
    auth_key: authKey,
    redirect_to: redirectTo,
  })

  return `${baseUrl}/v1/sessions/auth-key?${params.toString()}`
}
