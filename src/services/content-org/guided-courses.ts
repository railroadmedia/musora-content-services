/**
 * @module GuidedCourses
 */
import { globalConfig } from '../config.js'
import { fetchHandler } from '../railcontent.js'
import './playlists-types.js'


const excludeFromGeneratedIndex: string[] = []

const BASE_PATH: string = `/api/content-org`

export async function enrollUserInGuidedCourse(guidedCourse, { notifications_enabled = false }) {
  const url: string = `${BASE_PATH}/v1/user/guided-courses/enroll-user/${guidedCourse}`
  return await fetchHandler(url, 'POST', null, { notifications_enabled })
}

export async function unEnrollUserInGuidedCourse(guidedCourse) {
  const url: string = `${BASE_PATH}/v1/user/guided-courses/un-enroll-user/${guidedCourse}`
  return await fetchHandler(url, 'POST')
}

export async function fetchEnrollmentPageMetadata(guidedCourse) {
  const url: string = `${BASE_PATH}/v1/user/guided-courses/enrollment/${guidedCourse}`
  return await fetchHandler(url, 'GET')
}

export async function pinGuidedCourse(guidedCourse) {
  const url: string = `${BASE_PATH}/v1/user/guided-courses/pin/${guidedCourse}`
  return await fetchHandler(url, 'POST')
}

export async function unPinGuidedCourse(guidedCourse) {
  const url: string = `${BASE_PATH}/v1/user/guided-courses/unpin/${guidedCourse}`
  return await fetchHandler(url, 'POST')
}

export async function guidedCourses() {
  const url: string = `${BASE_PATH}/v1/user/guided-courses/`
  return await fetchHandler(url, 'GET')
}
