/**
 * @module Sessions
 */
import { globalConfig } from '../config.js'
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
  return fetch(`${baseUrl}/v1/sessions`, {
    method: 'POST',
    headers: {
      'X-Client-Platform': 'mobile',
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
 * @param {string|null} brand - Optional brand parameter (drumeo, pianote, guitareo, singeo)
 * @returns {Promise<{data: string}>} Temporary auth key valid for 5 minutes
 *
 * @example
 * getAuthKey('drumeo')
 *   .then(response => {
 *     const authKey = response.data
 *     const webViewUrl = `https://app.musora.com/page?user_id=${userId}&auth_key=${authKey}`
 *   })
 *   .catch(error => console.error(error));
 */
export async function getAuthKey(brand = null) {
  const baseUrl = `${globalConfig.baseUrl}/api/user-management-system`
  const url = brand ? `${baseUrl}/v1/auth-key?brand=${brand}` : `${baseUrl}/v1/auth-key`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer 503154|sArOCAtYT3ejVnCdoZTj8ocEfQbfDWi5GTTtooQ107d93d29`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get auth key: ${response.status}`)
  }

  return response.json()
}

export async function loginWithAuthKey(userId, authKey, deviceName, deviceToken, platform) {
  const baseUrl = `${globalConfig.baseUrl}/api/user-management-system`
  return fetch(`${baseUrl}/v1/sessions/auth-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: null,
    },
    body: JSON.stringify({
      user_id: userId,
      auth_key: authKey,
      device_name: deviceName,
      device_token: deviceToken,
      platform: platform,
    }),
  })
}
