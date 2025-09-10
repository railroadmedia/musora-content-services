/**
 * @module GuidedCourses
 */
import { fetchHandler } from '../railcontent.js'
import {contentStatusStarted, getProgressPercentage, getProgressState} from '../contentProgress.js'
import './playlists-types.js'


const excludeFromGeneratedIndex: string[] = []

const BASE_PATH: string = `/api/content-org`

export async function enrollUserInGuidedCourse(guidedCourse, { notifications_enabled = false }) {
  const url: string = `${BASE_PATH}/v1/user/guided-courses/enroll-user/${guidedCourse}`
  const response = await fetchHandler(url, 'POST', null, { notifications_enabled })
  // we only get the text response back (no status code) so I cannot do error checking on this. We hope it works
  const state = await getProgressState(guidedCourse)
  // If the content has been started already we don't want to reset the progress
  if (!state) {
    await contentStatusStarted(guidedCourse)
  }
  return response
}

export async function unEnrollUserInGuidedCourse(guidedCourse) {
  const url: string = `${BASE_PATH}/v1/user/guided-courses/un-enroll-user/${guidedCourse}`
  return await fetchHandler(url, 'POST')
}

export async function fetchEnrollmentPageMetadata(guidedCourse) {
  const url: string = `${BASE_PATH}/v1/user/guided-courses/enrollment/${guidedCourse}`
  return await fetchHandler(url, 'GET')
}

export async function guidedCourses() {
  const url: string = `${BASE_PATH}/v1/user/guided-courses/`
  return await fetchHandler(url, 'GET')
}
