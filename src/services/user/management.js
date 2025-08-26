/**
 * @module UserManagement
 */
import { fetchHandler as railcontentFetchHandler } from '../railcontent.js'
import { fetchHandler, fetchJSONHandler } from '../../lib/httpHelper.js'
import { globalConfig } from '../config.js'
import './types.js'
import { HttpClient } from '../../infrastructure/http/HttpClient'

const baseUrl = `/api/user-management-system`

/**
 * Fetches the blocked users for the current user.
 * @returns {Promise<Array<BlockedUsersDTO>>}
 */
export async function blockedUsers() {
  const url = `${baseUrl}/v1/users/${globalConfig.sessionConfig.userId}/blocked`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.get(url)
}

/**
 * Block the provided user
 * @param userId
 * @returns {Promise<any|string|null>}
 */
export async function blockUser(userId) {
  const url = `${baseUrl}/v1/block/${userId}`
  return railcontentFetchHandler(url, 'post')
}

/**
 * Unblock the provided user. Returns a 422 if the user wasn't blocked
 * @param userId
 * @returns {Promise<any|string|null>}
 */
export async function unblockUser(userId) {
  const url = `${baseUrl}/v1/unblock/${userId}`
  return railcontentFetchHandler(url, 'post')
}

/**
 * Upload a picture to the server
 * @param {string} fieldKey
 * @param {File} file
 * @returns {Promise<any|string|null>}
 */
export async function uploadPicture(fieldKey, file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('fieldKey', fieldKey)
  const apiUrl = `${baseUrl}/v1/picture`

  const response = await fetchHandler(
    apiUrl,
    globalConfig.sessionConfig.token,
    globalConfig.baseUrl,
    'POST',
    null,
    null,
    formData
  )

  if (!response.ok) {
    const problemDetails = await response.json()
    console.log('Error uploading picture:', problemDetails.detail)
    throw new Error(`Upload failed: ${problemDetails.detail}`)
  }

  const { url } = await response.json()
  console.log('Picture uploaded successfully:', url)

  return url
}

/**
 * Saves a picture uploaded to S3
 * @param {string} fieldKey
 * @param {string} s3_bucket_path
 * @returns {Promise<any|string|null>}
 */
export async function uploadPictureFromS3(fieldKey, s3_bucket_path) {
  const apiUrl = `${baseUrl}/v1/picture/s3`

  const response = await fetchJSONHandler(
    apiUrl,
    globalConfig.sessionConfig.token,
    globalConfig.baseUrl,
    'POST',
    null,
    {
      fieldKey,
      s3_bucket_path,
    }
  )

  if (!response.ok) {
    const problemDetails = await response.json()
    console.log('Error uploading picture:', problemDetails.detail)
    throw new Error(`Upload failed: ${problemDetails.detail}`)
  }

  const { url } = await response.json()

  return url
}

/**
 * @param {string} pictureUrl
 * @returns {Promise<any>}
 */
export async function deletePicture(pictureUrl) {
  const apiUrl = `${baseUrl}/v1/picture`

  fetchJSONHandler(apiUrl, globalConfig.sessionConfig.token, globalConfig.baseUrl, 'DELETE', null, {
    picture_url: pictureUrl,
  })
}

/**
 * @param {number} [userId=globalConfig.sessionConfig.userId]
 * @returns {Promise<User|null>}
 */
export async function getUserData(userId = globalConfig.sessionConfig.userId) {
  const apiUrl = `${baseUrl}/v1/users/${userId}`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.get(apiUrl)
}

/**
 * @param displayName - The display name to check for availability.
 * @returns {Promise<{ available: boolean }>} - An object indicating if the display name is available.
 */
export async function isDisplayNameAvailable(displayName) {
  const apiUrl = `${baseUrl}/v1/users/display-names/available?display_name=${encodeURIComponent(displayName)}`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.get(apiUrl)
}

/**
 * @param newDisplayName - The new display name to set for the user.
 * @returns {Promise<User>} - A promise that resolves when the display name is updated.
 */
export async function updateDisplayName(newDisplayName) {
  const apiUrl = `${baseUrl}/v1/users/${globalConfig.sessionConfig.userId}/display-name`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.put(apiUrl, { display_name: newDisplayName })
}

/**
 * @param {string} email - The new display name to set for the user.
 * @param {string} password - The current password of the user for verification.
 * @returns {Promise<void>} - A promise that resolves when the email change request is made.
 */
export async function requestEmailChange(email, password) {
  const apiUrl = `${baseUrl}/v1/users/${globalConfig.sessionConfig.userId}/email-change`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.post(apiUrl, { email, password })
}

/**
 * @param {string} token - The token sent to the user's email for verification.
 * @returns {Promise<void>} - A promise that resolves when the email change is confirmed.
 */
export async function confirmEmailChange(token) {
  const apiUrl = `${baseUrl}/v1/users/email-change/confirm`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.post(apiUrl, { token })
}
