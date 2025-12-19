/**
 * @module UserManagement
 */
import { GET, POST, PUT, DELETE } from '../../infrastructure/http/HttpClient.ts'
import { globalConfig } from '../config.js'
import './types.js'

const baseUrl = `/api/user-management-system`

/**
 * Fetches the blocked users for the current user.
 * @returns {Promise<Array<BlockedUsersDTO>>}
 */
export async function blockedUsers() {
  const url = `${baseUrl}/v1/users/${globalConfig.sessionConfig.userId}/blocked`
  return await GET(url)
}

/**
 * Block the provided user
 * @param userId
 * @returns {Promise<any|string|null>}
 */
export async function blockUser(userId) {
  const url = `${baseUrl}/v1/block/${userId}`
  return await POST(url, null)
}

/**
 * Unblock the provided user. Returns a 422 if the user wasn't blocked
 * @param userId
 * @returns {Promise<any|string|null>}
 */
export async function unblockUser(userId) {
  const url = `${baseUrl}/v1/unblock/${userId}`
  return await POST(url, null)
}

/**
 * Upload a picture to the server
 * @param {string} fieldKey
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function uploadPicture(fieldKey, file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('fieldKey', fieldKey)
  const apiUrl = `${baseUrl}/v1/picture`
  const response = await POST(apiUrl, formData)
  return response?.url
}

/**
 * Saves a picture uploaded to S3
 * @param {string} fieldKey
 * @param {string} s3_bucket_path
 * @returns {Promise<any|string|null>}
 */
export async function uploadPictureFromS3(fieldKey, s3_bucket_path) {
  const apiUrl = `${baseUrl}/v1/picture/s3`
  const response = await POST(apiUrl, { fieldKey, s3_bucket_path })
  return response?.url
}

/**
 * @param {string} pictureUrl
 * @returns {Promise<any>}
 */
export async function deletePicture(pictureUrl) {
  const apiUrl = `${baseUrl}/v1/picture`
  await DELETE(apiUrl, { picture_url: pictureUrl })
}

/**
 * @param {number} [userId=globalConfig.sessionConfig.userId]
 * @returns {Promise<User|null>}
 */
export async function getUserData(userId = globalConfig.sessionConfig.userId) {
  const apiUrl = `${baseUrl}/v1/users/${userId}`
  return await GET(apiUrl)
}

/**
 * @param userName - The display name to check for availability.
 * @returns {Promise<{ available: boolean }>} - An object indicating if the display name is available.
 */
export async function isUsernameAvailable(userName) {
  const apiUrl = `${baseUrl}/v1/users/usernames/available?username=${encodeURIComponent(userName)}`
  return await GET(apiUrl)
}

/**
 * @param newDisplayName - The new display name to set for the user.
 * @returns {Promise<User>} - A promise that resolves when the display name is updated.
 */
export async function updateDisplayName(newDisplayName) {
  const apiUrl = `${baseUrl}/v1/users/${globalConfig.sessionConfig.userId}/display-name`
  return await PUT(apiUrl, { display_name: newDisplayName })
}

/**
 * Updates the user's signature.
 *
 * @param {SetUserSignatureParams} params - Parameters containing the user's signature.
 * @returns {Promise<{ signature: string }>} - A promise that resolves with the updated signature data.
 */
export async function setUserSignature(params) {
  const apiUrl = `/api/forums/v1/signature`
  return await POST(apiUrl, params)
}

/**
 * Retrieves the current signature for the authenticated user.
 *
 * @returns {Promise<{ signature: string }>} - A promise that resolves with the user's current signature data.
 */
export async function getUserSignature() {
  const apiUrl = `/api/forums/v1/signature`
  return await GET(apiUrl)
}

/**
 * Toggles whether the user's signature is displayed publicly.
 *
 * @param {boolean} [showSignature=true] - Whether to show (`true`) or hide (`false`) the user's signature.
 * @returns {Promise<{ show_signature: boolean }>} - A promise that resolves with the updated visibility state.
 */
export async function toggleSignaturePrivate(showSignature = true) {
  const apiUrl = `/api/forums/v1/signature/toggle`
  return await PUT(apiUrl, { show_signature: showSignature })
}



