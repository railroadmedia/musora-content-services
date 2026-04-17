/**
 * @module EndScreen Types
 */

export type EndScreenVariant =
  | 'countdown-up-next'
  | 'course-complete'

export interface CtaLabels {
  primary: string
  secondary?: string
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
  parent_id?: number
  children?: CourseInCollection[]
}

export interface Playlist {
  id: number
  items?: ContentItem[]
}

export interface GetEndScreenParams {
  lesson: ContentItem
  course?: Course | null
  collection?: Collection | null
  playlist?: Playlist | null
  brand: string
}
