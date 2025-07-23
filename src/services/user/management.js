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
