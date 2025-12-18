/**
 * @module GuidedCourses
 */
import { GET, POST } from '../../infrastructure/http/HttpClient.js'
import { contentStatusStarted, getProgressState } from '../contentProgress.js'
import './playlists-types.js'

const excludeFromGeneratedIndex: string[] = []

const BASE_PATH: string = `/api/content-org`

export async function enrollUserInGuidedCourse(guidedCourse, { notifications_enabled = false }) {
  const url: string = `${BASE_PATH}/v1/user/guided-courses/enroll-user/${guidedCourse}`
  const response = await POST(url, { notifications_enabled })
  const state = await getProgressState(guidedCourse)
  if (!state) {
    await contentStatusStarted(guidedCourse)
  }
  return response
}

export async function unEnrollUserInGuidedCourse(guidedCourse) {
  const url: string = `${BASE_PATH}/v1/user/guided-courses/un-enroll-user/${guidedCourse}`
  return await POST(url, null)
}

export async function fetchEnrollmentPageMetadata(guidedCourse) {
  const url: string = `${BASE_PATH}/v1/user/guided-courses/enrollment/${guidedCourse}`
  return await GET(url)
}

export async function guidedCourses() {
  const url: string = `${BASE_PATH}/v1/user/guided-courses/`
  return await GET(url)
}
