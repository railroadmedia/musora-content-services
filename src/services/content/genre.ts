/**
 * @module Genre
 */
import { DEFAULT_FIELDS, filtersToGroq } from '../../contentTypeConfig.js'
import { fetchSanity, getSanityDate, getSortOrder } from '../sanity.js'
import { FilterBuilder } from '../../filterBuilder.js'

export interface Genre {
  lessons?: GenreLesson[]
  lessons_count: number
  name: string
  thumbnail: string
  type: 'genre'
}

export async function fetchGenres(brand: string): Promise<Genre[]> {
  const filter = await new FilterBuilder(`brand == "${brand}" && references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  const query = `
  *[_type == 'genre'] {
    'type': _type,
    name,
    'thumbnail': thumbnail_url.asset->url,
    "lessons_count": count(*[${filter}])
  } |order(lower(name)) `
  return fetchSanity(query, true)
}

/**
 * Fetch a single genre by their name and brand
 *
 * @param {string} name - The name of the genre to fetch.
 * @param {string} [brand] - The brand for which to fetch the instructor. Lesson count will be filtered by this brand if provided.
 * @returns {Promise<Instructor[]>} - A promise that resolves to an instructor object or null if not found.
 *
 * @example
 * fetchGenreByName('drumeo')
 *   .then(instructors => console.log(instructors))
 *   .catch(error => console.error(error));
 */
export async function fetchGenreByName(name: string, brand?: string): Promise<object> {
  const brandFilter = brand ? `brand == "${brand}" && ` : ''
  const filter = await new FilterBuilder(`${brandFilter} references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  const query = `
  *[_type == 'genre' && name == '${name}'] {
    'type': _type, name,
    'thumbnail':thumbnail_url.asset->url,
    "lessonsCount": count(*[${filter}])
  }`
  return fetchSanity(query, true)
}

export interface FetchGenreLessonsOptions {
  sort?: string
  searchTerm?: string
  page?: number
  limit?: number
  includedFields?: Array<string>
  progressIds?: Array<number>
}

export interface LessonsByGenreResponse {
  entity: Genre[]
}

export interface GenreLesson {
  artist: {
    name: string
    thumbnail: string | null
  } | null
  artist_name: string
  brand: string
  child_count: number | null
  difficulty: number | null
  difficulty_string: string | null
  genre: string[] // array of genre names
  id: number
  image: string
  length_in_seconds: number
  parent_id: number | null
  permission_id: number[]
  published_on: string // ISO timestamp string
  sanity_id: string
  slug: string
  status: string // can narrow to "published" if consistent
  thumbnail: string
  title: string
  type: string // e.g. "song"
  need_access: boolean
  page_type: string // e.g. "song"
}

/**
 * Fetch the genre's lessons.
 * @param {string} brand - The brand for which to fetch lessons.
 * @param {string} name - The name of the genre
 * @param {Object} params - Parameters for sorting, searching, pagination and filtering.
 * @param {string} [params.sort="-published_on"] - The field to sort the lessons by.
 * @param {string} [params.searchTerm=""] - The search term to filter the lessons.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @param {Array<string>} [params.includedFields=[]] - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock'].
 * @param {Array<number>} [params.progressIds=[]] - The ids of the lessons that are in progress or completed
 * @returns {Promise<LessonsByGenreResponse>} - The lessons for the artist and some details about the artist (name and thumbnail).
 *
 * @example
 * fetchGenreLessons('drumeo', 'Blues', 'song', {'-published_on', '', 1, 10, ["difficulty,Intermediate"], [232168, 232824, 303375, 232194, 393125]})
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchGenreLessons(
  brand: string,
  name: string,
  contentType: string,
  {
    sort = '-published_on',
    searchTerm = '',
    page = 1,
    limit = 10,
    includedFields = [],
    progressIds = [],
  }: FetchGenreLessonsOptions = {}
): Promise<LessonsByGenreResponse> {
  const fieldsString = DEFAULT_FIELDS.join(',')
  const start = (page - 1) * limit
  const end = start + limit
  const searchFilter = searchTerm ? `&& title match "${searchTerm}*"` : ''
  const sortOrder = getSortOrder(sort, brand)
  const addType = contentType ? `_type == '${contentType}' && ` : ''
  const includedFieldsFilter = includedFields.length > 0 ? filtersToGroq(includedFields) : ''
  // limits the results to supplied progressIds for started & completed filters
  const progressFilter =
    progressIds !== undefined ? `&& railcontent_id in [${progressIds.join(',')}]` : ''
  const now = getSanityDate(new Date())
  const query = `{
    "entity":
      *[_type == 'genre' && name == '${name}']
        {'type': _type, name, 'thumbnail':thumbnail_url.asset->url,
        'lessons_count': count(*[${addType} brand == '${brand}' && references(^._id)]),
        'lessons': *[${addType} brand == '${brand}' && references(^._id) && (status in ['published'] || (status == 'scheduled' && defined(published_on) && published_on >= '${now}')) ${searchFilter} ${includedFieldsFilter} ${progressFilter}]{${fieldsString}}
      [${start}...${end}]}
      |order(${sortOrder})
  }`
  return fetchSanity(query, true)
}
