import {fetchSimilarItems, rankCategories} from '../recommendations.js'
import {fetchByRailContentIds, fetchCourseCollectionData, fetchRelatedLessons} from '../sanity.js'
import { addContextToContent } from '../contentAggregator.js'
import { playAlongLessonTypes, jamTrackLessonTypes, lessonTypesMapping } from '../../contentTypeConfig.js'
import {getUserData} from "../user/management.js";
import type {
  ContentItem,
  Collection,
  Course,
  Playlist,
  CtaLabels,
  EndScreenResult,
  GetEndScreenParams,
} from './types.ts'

// ─── Constants ────────────────────────────────────────────────────────────────

const SINGLE_SONG_LESSON_TYPES: string[] = [
  ...playAlongLessonTypes,
  ...jamTrackLessonTypes,
  ...lessonTypesMapping['single lessons'],
]
const COURSE_COMPLETE_CTA: CtaLabels = { primary: 'Play Now', secondary: 'Back to Home'}
const COUNTDOWN_CTA: CtaLabels = { primary: 'Play Now' }
const COUNTDOWN_CTA_REPLAY: CtaLabels = { primary: 'Play Now', secondary: 'Replay' }

export async function getEndScreen({
  lesson,
  course = null,
  collection = null,
  playlist = null,
  user_playlist_item_index = null,
  next_item = null,
  brand
}: GetEndScreenParams): Promise<EndScreenResult> {
  const userData = await getUserData()
  const isAdmin = userData?.is_admin ?? false

  if (playlist) {
    const nextItem = next_item ??
      getNextItemInPlaylistOrNull(lesson.id, playlist, user_playlist_item_index, isAdmin)

    return nextItem ? buildCountdown(nextItem, false) : null
  }

  if (SINGLE_SONG_LESSON_TYPES.includes(lesson.type ?? '')) {
    return buildCountdown(await fetchEndScreenRecommendation(brand, lesson.id), true)
  }

  if (!course) {
    return buildCountdown(await fetchEndScreenRecommendation(brand, lesson.id), false)
  }

  const nextLesson = getNextLessonOrNull(lesson.id, course, isAdmin)
  if (nextLesson) {
    return buildCountdown(nextLesson, false)
  }

  // TODO: remove internal fetch if FE provides collection.children directly
  // collection.vue fetches lessonsInCourse (course children) but not the parent collection's courses
  const resolvedCollection: Collection | null =
    collection?.type === 'course' && collection?.parent_id
      ? await fetchCourseCollectionData(collection.parent_id)
      : collection

  const nextCourseFirstLesson = getFirstLessonOfNextCourseOrNull(course.id, resolvedCollection, isAdmin)
  if (nextCourseFirstLesson) {
    return buildCourseComplete(nextCourseFirstLesson)
  }

  return buildCourseComplete(await fetchEndScreenRecommendation(brand, lesson.id, course.id))
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function buildCountdown(upNext: any, withReply: boolean): EndScreenResult {
  return { variant: 'countdown-up-next', upNext, countdownAutoplay: true, ctaLabels: withReply ? COUNTDOWN_CTA_REPLAY : COUNTDOWN_CTA }
}

function buildCourseComplete(upNext: any): EndScreenResult {
  return { variant: 'course-complete', upNext, countdownAutoplay: false, ctaLabels: COURSE_COMPLETE_CTA }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNextItemInPlaylistOrNull(contentId: number, playlist: Playlist, user_playlist_item_index: number|null, isAdmin: boolean): ContentItem | null {
  const items = playlist.items ?? []
  const index = user_playlist_item_index !== null ? user_playlist_item_index : items.findIndex((item) => Number(item.id) === Number(contentId))
  if (index < 0 || index === items.length - 1) return null
  return items.slice(index + 1).find(item => isReleasedContent(item, isAdmin)) ?? null
}

function getNextLessonOrNull(lessonId: number, course: Course, isAdmin: boolean): ContentItem | null {
  const children = course.children ?? []
  const index = children.findIndex((child) => Number(child.id) === Number(lessonId))
  if (index < 0 || index === children.length - 1) return null
  return children.slice(index + 1).find(child => isReleasedContent(child, isAdmin)) ?? null
}

function isReleasedContent(content: ContentItem, isAdmin: boolean): boolean {
  if (isAdmin) return true
  if (!content?.status) return false
  return (content.status === 'published' || content.status === 'scheduled') && !content.need_access
}

function getFirstLessonOfNextCourseOrNull(
  courseId: number,
  collection: Collection | null,
  isAdmin: boolean
): ContentItem | null {
  if (!collection) return null
  const courses = collection.children ?? []
  const index = courses.findIndex((course) => Number(course.id) === Number(courseId))
  if (index < 0 || index === courses.length - 1) return null
  const nextCourse = courses.slice(index + 1).find(course => isReleasedContent(course, isAdmin))
  if (!nextCourse?.children) return null
  return nextCourse.children.find(lesson => isReleasedContent(lesson, isAdmin)) ?? null
}

async function fetchEndScreenRecommendation(
  brand: string,
  contentId: number,
  parentId: number | null = null
): Promise<any | null> {
  try {
    let recData: number[] = await fetchSimilarItems(contentId, brand, 20)
    let recommended = null
    if (!Array.isArray(recData) || recData.length === 0) {
      const relatedLesson =  await fetchRelatedLessons(parentId ?? contentId).then((result) =>
        result.related_lessons?.[0] ?? null
      )
      recData = relatedLesson?.id ? [relatedLesson.id] : []
    }

    const contents: ContentItem[] = await fetchByRailContentIds(recData)
    recommended =
      contents?.find((c) => c.id !== parentId && (!c.parent_id || c.parent_id !== parentId)) ??
      contents?.find((c) => c.id !== parentId) ??
      null

    return await addContextToContent(() => recommended, {
      addProgressPercentage: true,
      addProgressStatus: true,
      addNavigateTo: true,
    })
  } catch {
    return null
  }
}
