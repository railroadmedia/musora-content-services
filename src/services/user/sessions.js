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
 * Sends a login request to the User Management System.
 *
 * The request always includes the `X-Client-Platform` header set to `"mobile"`.
 * This header is used by the backend to identify the source client type.
 *
 * @param {string} email - The user's email address.
 * @param {string} password - The user's account password.
 * @param {string|null} [deviceName] - A human-readable identifier for the device (e.g. "iPhone 15").
 * @param {string|null} [deviceToken] - Optional Firebase Cloud Messaging token for push notifications.
 * @param {string|null} [platform] - The device platform (e.g. "ios", "android", "web").
 *
 * @returns {Promise<Response>} - The raw `fetch` Response object.
 *   Call `response.json()` to access the API payload, which typically includes:
 *   - `token` (string): Access token.
 *   - `refresh_token` (string): Refresh token.
 *   - `user` (object): Authenticated user data.
 *
 * @example
 * login('john@doe.com', 'music123', 'Pixel 8', 'abc123', 'android')
 *   .then(res => res.json())
 *   .then(data => console.log(data))
 *   .catch(err => console.error(err));
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

export async function loginWithProvider(provider, providerIdToken, deviceToken, deviceName, platform) {
  const baseUrl = `${globalConfig.baseUrl}/api/user-management-system`

  try {
    const response = await fetch(`${baseUrl}/v1/auth/${provider}/mobile`, {
      method: 'GET',
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
}

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
