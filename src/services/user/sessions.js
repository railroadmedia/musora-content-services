/**
 * @module Sessions
 */
import { globalConfig } from '../config.js'
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { HttpError } from '../../infrastructure/http/interfaces/HttpError'
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
 * Generates the authentication key for the user.
 *
 * @returns {Promise<{key: string}|HttpError>} - The authentication key or an error
 */
export async function generateAuthKey() {
  const apiUrl = `/api/user-management-system/v1/sessions/auth-key`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.post(apiUrl, { token })
}

/**
 * Authenticates the user via an authentication key.
 *
 * @param {string} key - The authentication key
 * @param {number} userId - The user ID
 *
 * @returns {Promise<AuthResponse|HttpError>} - User data and authentication token or an error
 */
export async function authenticateViaAuthKey(key, userId) {
  const apiUrl = `/api/user-management-system/v1/sessions/auth-key`
  const httpClient = new HttpClient(globalConfig.baseUrl)
  return httpClient.post(apiUrl, { key, user_id: userId })
}
