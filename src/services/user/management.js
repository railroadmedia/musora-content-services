/**
 * @module User-Management
 */
import { globalConfig } from '../config.js'
import './types.js'

globalConfig = {
  railcontentConfig: {
    token: 'pDxpLMl0xtG6hJTQC092Yw5MUKg9UKkSkl2X1ZXx',
    userId: 631736,
    authToken: 'pDxpLMl0xtG6hJTQC092Yw5MUKg9UKkSkl2X1ZXx',
    //baseUrl = 'https://dev.musora.com:8443'
  }
}

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

const baseUrl = `${globalConfig.railcontentConfig.baseUrl}/api/user-management-system/v1`

export async function blockUser(userId) {
  const url = `${baseUrl}/block/${userId}`
  postHandler(url)
}

export async function unblockUser(userId) {
  const url = `${baseUrl}/unblock/${userId}`
  postHandler(url)
}

async function postHandler(url, body = null) {
  let headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-TOKEN': globalConfig.railcontentConfig.token,
  }

  if (globalConfig.railcontentConfig.authToken) {
    headers['Authorization'] = `Bearer ${globalConfig.railcontentConfig.authToken}`
  }

  const options = {
    method: 'post',
    headers,
  }
  if (body) {
    options.body = JSON.stringify(body)
  }
  try {
    if (globalConfig.railcontentConfig.baseUrl) {
      if (url.startsWith('/')) {
        return fetch(globalConfig.railcontentConfig.baseUrl + url, options)
      }
    }
    const response = await fetch(url, options)
    if (!response.ok) {
      console.error(`Fetch error: post ${url} ${response.status} ${response.statusText}`)
      console.log(response)
    }
  } catch (error) {
    console.error('Fetch error:', error)
  }
}
