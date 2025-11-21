/**
 * @namespace Content
 * @property {module:Instructor} Instructor
 * @property {module:Genre} Genre
 * @property {module:Artist} Artist
 */

export type LessonType = 'workout' | 'challenge-part' | 'song' | string
export type LessonPageType = 'lesson' | 'song' | string

export interface ArtistObject {
  name: string
  thumbnail: string | null
}

export interface Lesson {
  artist: ArtistObject | string | null
  artist_name: string
  brand: string
  child_count: number | null
  difficulty: number | null
  difficulty_string: string | null
  genre: string[] | string | null
  id: number
  image: string
  length_in_seconds: number
  parent_id: number | null
  permission_id: number[]
  published_on: string
  sanity_id: string
  slug: string
  status: string
  thumbnail: string
  title: string
  type: LessonType
  need_access: boolean
  page_type: LessonPageType
}
