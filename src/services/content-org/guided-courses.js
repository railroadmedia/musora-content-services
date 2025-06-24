/**
 * @module GuidedCourses
 */
import { globalConfig } from '../config.js'
import { fetchHandler } from '../railcontent.js'
import './playlists-types.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

const BASE_PATH = `/api/content-org`

export async function enrollUserInGuidedCourse(guidedCourse) {
  const url = `${BASE_PATH}/v1/user/guided-courses/enroll-user/${guidedCourse}`
  return await fetchHandler(url, 'POST')
}

export async function unEnrollUserInGuidedCourse(guidedCourse) {
  const url = `${BASE_PATH}/v1/user/guided-courses/un-enroll-user/${guidedCourse}`
  return await fetchHandler(url, 'POST')
}

export async function fetchEnrollmentPageMetadata(guidedCourse) {
  const url = `${BASE_PATH}/v1/user/guided-courses/enrollment/${guidedCourse}`
  return await fetchHandler(url, 'GET')
}
