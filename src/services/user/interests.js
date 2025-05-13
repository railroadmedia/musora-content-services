/**
 * @module Interests
 */
import { globalConfig } from '../config.js'
import { fetchHandler } from '../railcontent.js'
import './types.js'

const baseUrl = `/api/user-management-system`

/**
 * @param {number} [userId=globalConfig.sessionConfig.userId] - The user ID
 * @returns {Promise<Array<number>>} - The list of interests
 */
export async function fetchInterests(userId = globalConfig.sessionConfig.userId) {
  const url = `${baseUrl}/v1/users/${userId}/interests`
  return fetchHandler(url, 'get')
}

/**
 * @param {number} contentId
 * @returns {Promise<any>}
 */
export async function markContentAsInterested(contentId) {
  if (!contentId) {
    throw new Error('contentId is required')
  }

  const url = `${baseUrl}/v1/users/interests/${contentId}`
  return fetchHandler(url, 'post')
}

/**
 * @param {number} contentId
 * @returns {Promise<any>}
 */
export async function removeContentAsInterested(contentId) {
  if (!contentId) {
    throw new Error('contentId is required')
  }

  const url = `${baseUrl}/v1/users/interests/${contentId}`
  return fetchHandler(url, 'delete')
}

/**
 * @param {string} [userId=globalConfig.sessionConfig.userId] - The user ID
 * @returns {Promise<Array<number>>} - The list of content the user is not interested in
 */
export async function fetchUninterests(userId = globalConfig.sessionConfig.userId) {
  const url = `${baseUrl}/v1/users/${userId}/uninterests`
  return fetchHandler(url, 'get')
}

/**
 * @param {number} contentId
 * @returns {Promise<any>}
 */
export async function markContentAsNotInterested(contentId) {
  if (!contentId) {
    throw new Error('contentId is required')
  }

  const url = `${baseUrl}/v1/users/uninterests/${contentId}`
  return fetchHandler(url, 'post')
}

/**
 * @param {number} contentId
 * @returns {Promise<any>}
 */
export async function removeContentAsNotInterested(contentId) {
  if (!contentId) {
    throw new Error('contentId is required')
  }

  const url = `${baseUrl}/v1/users/uninterests/${contentId}`
  return fetchHandler(url, 'delete')
}
