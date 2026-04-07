import { fetchSimilarItems } from '../recommendations.js'
import { fetchByRailContentIds, fetchCourseCollectionData } from '../sanity.js'
import { addContextToContent } from '../contentAggregator.js'
import { playAlongLessonTypes, jamTrackLessonTypes, lessonTypesMapping } from '../../contentTypeConfig.js'
import type {
  ContentItem,
  Collection,
  Course,
  Playlist,
  LearningPath,
  LPLesson,
  CtaLabels,
  EndScreenResult,
  GetEndScreenParams,
  GetLearningPathEndScreenParams,
} from './types.ts'

// ─── Constants ────────────────────────────────────────────────────────────────

const SINGLE_SONG_LESSON_TYPES: string[] = [
  ...playAlongLessonTypes,
  ...jamTrackLessonTypes,
  ...lessonTypesMapping['single lessons'],
]
const COURSE_COMPLETE_CTA: CtaLabels = { primary: 'Play Now', secondary: 'Back to Home' }
const COUNTDOWN_CTA: CtaLabels = { primary: 'Play Now', secondary: 'Cancel' }
const PATH_COMPLETE_CTA: CtaLabels = { primary: 'View Achievement', secondary: 'Back to Home' }
const SESSION_COMPLETE_CTA: CtaLabels = { primary: 'View Session', secondary: 'Back to Home' }

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getEndScreen({
  lesson,
  course = null,
  collection = null,
  playlist = null,
  brand,
  learningPath = null,
  lessonWasPreviouslyCompleted = false,
}: GetEndScreenParams): Promise<EndScreenResult> {
  if (learningPath) {
    return getLearningPathEndScreen({ lesson, learningPath, lessonWasPreviouslyCompleted })
  }

  if (SINGLE_SONG_LESSON_TYPES.includes(lesson.type ?? '')) {
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
  const resolvedCollection: Collection | null =
    collection?.type === 'course-collection' && !collection.children
      ? await fetchCourseCollectionData(collection.id)
      : collection

  const nextCourseFirstLesson = getFirstLessonOfNextCourseOrNull(course.id, resolvedCollection)
  if (nextCourseFirstLesson) {
    return buildCourseComplete(nextCourseFirstLesson)
  }

  return buildCourseComplete(await fetchEndScreenRecommendation(brand, course.id, course.id))
}

/**
 * Sync variant — use this when you need a reactive computed (e.g. Vue computed property).
 * getEndScreen({ learningPath }) calls this internally.
 */
export function getLearningPathEndScreen({
  lesson,
  learningPath,
  lessonWasPreviouslyCompleted = false,
}: GetLearningPathEndScreenParams): EndScreenResult {
  const children = learningPath.children ?? []
  const dailies = learningPath.learning_path_dailies ?? []
  const previousDailies = learningPath.previous_learning_path_dailies ?? []
  const nextDailies = learningPath.next_learning_path_dailies ?? []

  const allLessonsCompleted =
    children.length > 0 && children.every((child) => child.progressStatus === 'completed')

  if (allLessonsCompleted && !lessonWasPreviouslyCompleted) {
    return buildPathComplete()
  }

  // When fewer than 3 daily lessons, combine previous + current + next (matches FE logic)
  type EffectiveLesson = LPLesson & { isNextLP?: boolean }
  const effectiveDailies: EffectiveLesson[] =
    dailies.length < 3
      ? [
          ...previousDailies,
          ...dailies,
          ...nextDailies.map((l) => ({ ...l, isNextLP: true })),
        ]
      : dailies

  if (learningPath.is_active_learning_path) {
    // Exclude next LP lessons when checking if today's session is done
    const currentDailies = effectiveDailies.filter((d) => !d.isNextLP)
    const dailyLessonsCompleted =
      currentDailies.length > 0 && currentDailies.every((d) => d.progressStatus === 'completed')
    const isTodaysLesson = effectiveDailies.some((d) => Number(d.id) === Number(lesson.id))

    if (!dailyLessonsCompleted) {
      const nextDailyLesson = getNextInArrayOrNull(lesson.id, effectiveDailies)
      if (nextDailyLesson) {
        return buildCountdown(nextDailyLesson)
      }
    }

    if (dailyLessonsCompleted && !lessonWasPreviouslyCompleted && isTodaysLesson) {
      return buildMethodSessionComplete()
    }
  }

  // Active LP: first incomplete lesson in path
  // Non-active LP: next in array, or wrap to first (matches FE logic)
  const nextLesson = learningPath.is_active_learning_path
    ? (children.find((child) => child.progressStatus !== 'completed') ?? null)
    : (getNextInArrayOrNull(lesson.id, children) ?? children[0] ?? null)

  return buildCountdown(nextLesson)
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function buildCountdown(upNext: any): EndScreenResult {
  return { variant: 'countdown-up-next', upNext, countdownAutoplay: true, ctaLabels: COUNTDOWN_CTA }
}

function buildCourseComplete(upNext: any): EndScreenResult {
  return { variant: 'course-complete', upNext, countdownAutoplay: false, ctaLabels: COURSE_COMPLETE_CTA }
}

function buildPathComplete(): EndScreenResult {
  return { variant: 'path-complete', upNext: null, countdownAutoplay: false, ctaLabels: PATH_COMPLETE_CTA }
}

function buildMethodSessionComplete(): EndScreenResult {
  return { variant: 'method-session-complete', upNext: null, countdownAutoplay: false, ctaLabels: SESSION_COMPLETE_CTA }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNextItemInPlaylistOrNull(contentId: number, playlist: Playlist): ContentItem | null {
  const items = playlist.items ?? []
  const index = items.findIndex((item) => Number(item.id) === Number(contentId))
  if (index < 0 || index === items.length - 1) return null
  return items.slice(index + 1).find(isReleasedContent) ?? null
}

function getNextLessonOrNull(lessonId: number, course: Course): ContentItem | null {
  const children = course.children ?? []
  const index = children.findIndex((child) => Number(child.id) === Number(lessonId))
  if (index < 0 || index === children.length - 1) return null
  return children.slice(index + 1).find(isReleasedContent) ?? null
}

function isReleasedContent(content: ContentItem): boolean {
  if (!content?.status) return true
  return content.status === 'published' || content.status === 'scheduled'
}

function getFirstLessonOfNextCourseOrNull(
  courseId: number,
  collection: Collection | null
): ContentItem | null {
  if (collection?.type !== 'course-collection') return null
  const courses = collection.children ?? []
  const index = courses.findIndex((course) => Number(course.id) === Number(courseId))
  const nextCourse = index >= 0 && index < courses.length - 1 ? courses[index + 1] : null
  return nextCourse?.children?.[0] ?? null
}

function getNextInArrayOrNull(contentId: number, items: LPLesson[]): LPLesson | null {
  const index = items.findIndex((item) => Number(item.id) === Number(contentId))
  if (index < 0 || index === items.length - 1) return null
  return items[index + 1] ?? null
}

async function fetchEndScreenRecommendation(
  brand: string,
  contentId: number,
  excludeId: number | null = null
): Promise<any | null> {
  try {
    let ids: number[] = await fetchSimilarItems(contentId, brand, 50)
    if (!Array.isArray(ids) || ids.length === 0) {
      //TODO: will be defined in config, need to decide with Chris about the ids
      ids = [373201]
    }

    const contents: ContentItem[] = await fetchByRailContentIds(ids)
    const recommended =
      contents?.find((c) => c.id !== excludeId && (!c.parent_id || c.parent_id !== excludeId)) ??
      null
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
