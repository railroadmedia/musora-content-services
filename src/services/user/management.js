/**
 * @module UserManagement
 */
import { fetchHandler as railcontentFetchHandler } from '../railcontent.js'
import { fetchHandler, fetchJSONHandler } from '../../lib/httpHelper.js'
import { globalConfig } from '../config.js'

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
  formData.append('picture', file)
  formData.append('fieldKey', fieldKey)
  const apiUrl = `${baseUrl}/v1/picture`

  const response = await fetchHandler(
    apiUrl,
    globalConfig.sessionConfig.token,
    globalConfig.baseUrl,
    'POST',
    null,
    null,
    {
      body: formData,
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.log('Error uploading picture:', errorText)
    throw new Error(`Upload failed: ${errorText}`)
  }

  const { url } = await response.json()

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
      body: {
        fieldKey,
        s3_bucket_path,
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.log('Error uploading picture:', errorText)
    throw new Error(`Upload failed: ${errorText}`)
  }

  const { url } = await response.json()

  return url
}
