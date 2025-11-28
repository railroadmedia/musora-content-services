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
  return HttpClient.client().get(`${baseUrl}/v1/users/${userId}`)
}

/**
 * @param userName - The display name to check for availability.
 * @returns {Promise<{ available: boolean }>} - An object indicating if the display name is available.
 */
export async function isUsernameAvailable(userName) {
  const apiUrl = `${baseUrl}/v1/users/usernames/available?username=${encodeURIComponent(userName)}`
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
 * Updates the user's signature.
 *
 * @param {SetUserSignatureParams} params - Parameters containing the user's signature.
 * @returns {Promise<{ signature: string }>} - A promise that resolves with the updated signature data.
 */
export async function setUserSignature(params) {
  const apiUrl = `/api/forums/v1/signature`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.post(apiUrl, params)
}

/**
 * Retrieves the current signature for the authenticated user.
 *
 * @returns {Promise<{ signature: string }>} - A promise that resolves with the user's current signature data.
 */
export async function getUserSignature() {
  const apiUrl = `/api/forums/v1/signature`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.get(apiUrl)
}

/**
 * Toggles whether the user's signature is displayed publicly.
 *
 * @param {boolean} [showSignature=true] - Whether to show (`true`) or hide (`false`) the user's signature.
 * @returns {Promise<{ show_signature: boolean }>} - A promise that resolves with the updated visibility state.
 */
export async function toggleSignaturePrivate(showSignature = true) {
  const apiUrl = `/api/forums/v1/signature/toggle`
  const httpClient = new HttpClient(globalConfig.baseUrl, globalConfig.sessionConfig.token)
  return httpClient.put(apiUrl, { show_signature: showSignature })
}



