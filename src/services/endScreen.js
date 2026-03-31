import { fetchSimilarItems } from './recommendations.js'
import { fetchByRailContentIds, fetchCourseCollectionData } from './sanity.js'
import { addContextToContent } from './contentAggregator.js'
import { playAlongLessonTypes, jamTrackLessonTypes, singleLessonTypes, liveArchivesLessonTypes, practiceAlongsLessonTypes, lessonTypesMapping } from '../contentTypeConfig.js'

const SINGLE_SONG_LESSON_TYPES = [...playAlongLessonTypes, ...jamTrackLessonTypes, ...lessonTypesMapping['single lessons']]
const COURSE_COMPLETE_CTA = { primary: 'Play Now', secondary: 'Back to Home' }
const COUNTDOWN_CTA = { primary: 'Play Now', secondary: 'Cancel' }

/**
 * @param {Object} params
 * @param {{id: number, type: string}} params.lesson
 * @param {{id: number, type: string, children: Array<{id: number}>}|null} params.course
 * @param {{id: number, type: string, children: Array<{id: number, children: Array<{id: number}>}>}|null} params.collection
 * @param {{id: number, items: Array<{id: number, type: string, status?: string}>}|null} params.playlist
 * @param {string} params.brand
 * @returns {Promise<{variant: string, upNext: Object|null, countdownAutoplay: boolean, ctaLabels: {primary: string, secondary: string}}>}
 */
export async function getEndScreen({ lesson, course = null, collection = null, playlist = null, brand }) {
  if (SINGLE_SONG_LESSON_TYPES.includes(lesson.type)) {
    return buildCountdown(await fetchEndScreenRecommendation(brand, lesson.id))
  }

  if (playlist) {
    const nextItemInPlaylist = getNextItemInPlaylistOrNull(lesson.id, playlist)
    if (nextItemInPlaylist) {
      return buildCountdown(nextItemInPlaylist)
    }
    return buildCourseComplete(await fetchEndScreenRecommendation(brand, lesson.id))
  }

  if (!course) {
    return buildCountdown(await fetchEndScreenRecommendation(brand, lesson.id))
  }

  const nextLesson = getNextLessonOrNull(lesson.id, course)
  if (nextLesson) {
    return buildCountdown(nextLesson)
  }

  // TODO: remove internal fetch if FE provides collection.children directly
  // collection.vue fetches lessonsInCourse (course children) but not the parent collection's courses
  const resolvedCollection =
    collection?.type === 'course-collection' && !collection.children
      ? await fetchCourseCollectionData(collection.id)
      : collection

  const nextCourseFirstLesson = getFirstLessonOfNextCourseOrNull(course.id, resolvedCollection)
  if (nextCourseFirstLesson) {
    return buildCourseComplete(nextCourseFirstLesson)
  }

  return buildCourseComplete(await fetchEndScreenRecommendation(brand, course.id, course.id))
}

function buildCountdown(upNext) {
  return { variant: 'countdown-up-next', upNext, countdownAutoplay: true, ctaLabels: COUNTDOWN_CTA }
}

function buildCourseComplete(upNext) {
  return { variant: 'course-complete', upNext, countdownAutoplay: false, ctaLabels: COURSE_COMPLETE_CTA }
}

/**
 * @param {number} contentId
 * @param {{items: Array<{id: number, type: string, status?: string}>}} playlist
 * @returns {Object|null}
 */
function getNextItemInPlaylistOrNull(contentId, playlist) {
  const items = playlist.items ?? []
  const index = items.findIndex((item) => Number(item.id) === Number(contentId))
  if (index < 0 || index === items.length - 1) return null
  return items.slice(index + 1).find(isReleasedContent) ?? null
}

/**
 * @param {number} lessonId
 * @param {{children: Array<{id: number, status?: string}>}} course
 * @returns {Object|null}
 */
function getNextLessonOrNull(lessonId, course) {
  const children = course.children ?? []
  const index = children.findIndex((child) => Number(child.id) === Number(lessonId))
  if (index < 0 || index === children.length - 1) return null
  return children.slice(index + 1).find(isReleasedContent) ?? null
}

function isReleasedContent(content) {
  if (!content?.status) return true
  return content.status === 'published' || content.status === 'scheduled'
}

/**
 * @param {number} courseId
 * @param {{type: string, children: Array<{id: number, children: Array<{id: number}>}>}|null} collection
 * @returns {Object|null}
 */
function getFirstLessonOfNextCourseOrNull(courseId, collection) {
  if (collection?.type !== 'course-collection') return null
  const courses = collection.children ?? []
  const index = courses.findIndex((course) => Number(course.id) === Number(courseId))
  const nextCourse = index >= 0 && index < courses.length - 1 ? courses[index + 1] : null
  return nextCourse?.children?.[0] ?? null
}

/**
 * @param {string} brand
 * @param {number} contentId
 * @returns {Promise<Object|null>}
 */
async function fetchEndScreenRecommendation(brand, contentId, excludeId = null) {
  try {
    const ids = await fetchSimilarItems(contentId, brand, 50)
    if (!Array.isArray(ids) || ids.length === 0) return null

    const contents = await fetchByRailContentIds(ids)
    const recommended = contents?.find((c) =>  c.id !== excludeId && (!c.parent_id || c.parent_id !== excludeId)) ?? null
    if (!recommended) return null
    return await addContextToContent(() => recommended, {
      addProgressPercentage: true,
      addProgressStatus: true,
      addNavigateTo: true,
    })
  } catch {
    return null
  }
}
