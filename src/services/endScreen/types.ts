/**
 * @module EndScreen Types
 */

export type EndScreenVariant =
  | 'countdown-up-next'
  | 'course-complete'
  | 'path-complete'
  | 'what-to-do-today'

export interface CtaLabels {
  primary: string
  secondary: string
}

export interface EndScreenResult {
  variant: EndScreenVariant
  upNext: any | null
  countdownAutoplay: boolean
  ctaLabels: CtaLabels
}

export interface ContentItem {
  id: number
  type?: string
  status?: string
  parent_id?: number
}

export interface Course {
  id: number
  type?: string
  children?: ContentItem[]
}

export interface CourseInCollection {
  id: number
  children?: ContentItem[]
}

export interface Collection {
  id: number
  type: string
  children?: CourseInCollection[]
}

export interface Playlist {
  id: number
  items?: ContentItem[]
}

export interface LPLesson {
  id: number
  progressStatus?: string
  [key: string]: any
}

export interface LearningPath {
  children?: LPLesson[]
  is_active_learning_path: boolean
  learning_path_dailies?: LPLesson[]
  previous_learning_path_dailies?: LPLesson[]
  next_learning_path_dailies?: LPLesson[]
}

export interface GetEndScreenParams {
  lesson: ContentItem
  course?: Course | null
  collection?: Collection | null
  playlist?: Playlist | null
  brand: string
  /** When provided, uses learning path end screen logic (no async fetch needed) */
  learningPath?: LearningPath | null
  /** Used with learningPath: true if lesson was already completed before this session */
  lessonWasPreviouslyCompleted?: boolean
}

export interface GetLearningPathEndScreenParams {
  lesson: Pick<ContentItem, 'id'>
  learningPath: LearningPath
  lessonWasPreviouslyCompleted?: boolean
}
