/**
 * @module Session-Management
 */
import { globalConfig } from '../config'
import './types'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

const baseUrl = `${globalConfig.baseUrl}/api/user-management-system`

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
 * @throws {Error} - If the request fails
 *
 * @example
 * login('john@doe.com', 'music123')
 *   .then(content => console.log(content))
 *   .catch(error => console.error(error));
 */
export async function login(email, password, deviceName, deviceToken, platform) {
  const response = await fetch(`${baseUrl}/v1/sessions`, {
    method: 'POST',
    headers: {
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

  if (response.ok) {
    return response.json()
  } else {
    console.error('Failed to log in', response.status)
    console.info(response)

    throw new Error(`Failed to log in: ${response.status} - ${response.statusText}`)
  }
}

/**
 * Logs the user out of the current session.
 *
 * @returns {Promise<void>}
 *
 * @throws {Error} - If the request fails
 *
 * @example
 * logout()
 *   .then()
 *   .catch(error => console.error(error));
 */
export async function logout() {
  const response = await fetch(`${baseUrl}/v1/sessions`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${globalConfig.railcontentConfig.authToken}`,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    console.error('Failed to log out', response.status)
    console.info(response)

    throw new Error(`Failed to log out: ${response.status} - ${response.statusText}`)
  }
}
