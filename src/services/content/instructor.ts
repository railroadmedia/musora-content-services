/**
 * @module Instructor
 */
import { FilterBuilder } from '../../filterBuilder.js'
import { filtersToGroq, getFieldsForContentType } from '../../contentTypeConfig.js'
import { buildEntityAndTotalQuery, fetchSanity, getSortOrder } from '../sanity.js'

export interface Instructor {
  lessonCount: number
  slug: string
  name: string
  short_bio: string
  thumbnail_url: string
}

/**
 * Fetch all instructor with lessons available for a specific brand.
 *
 * @param {string} brand - The brand for which to fetch instructors.
 * @returns {Promise<Instructor[]>} - A promise that resolves to an array of instructor objects.
 *
 * @example
 * fetchInstructors('drumeo')
 *   .then(instructors => console.log(instructors))
 *   .catch(error => console.error(error));
 */
export async function fetchInstructors(brand: string): Promise<Instructor[]> {
  const filter = await new FilterBuilder(`brand == "${brand}" && references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  const query = `
  *[_type == "instructor"] {
    name,
    slug,
    "lessonsCount": count(*[${filter}])
  }[lessonsCount > 0] |order(lower(name)) `
  return fetchSanity(query, true, { processNeedAccess: false })
}

/**
 * Fetch a single instructor by their name
 *
 * @param {string} slug - The slug of the instructor to fetch.
 * @param {string} [brand] - The brand for which to fetch the instructor. Lesson count will be filtered by this brand if provided.
 * @returns {Promise<Instructor[]>} - A promise that resolves to an instructor object or null if not found.
 *
 * @example
 * fetchInstructorBySlug('66samus', 'drumeo')
 *   .then(instructor => console.log(instructor))
 *   .catch(error => console.error(error));
 */
export async function fetchInstructorBySlug(
  slug: string,
  brand?: string
): Promise<Instructor | null> {
  const brandFilter = brand ? `brand == "${brand}" && ` : ''
  const filter = await new FilterBuilder(`${brandFilter} references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  const query = `
  *[_type == "instructor" && slug.current == '${slug}'][0] {
    name,
    "slug": slug.current,
    short_bio,
    'thumbnail_url': thumbnail_url.asset->url,
    "lessonsCount": count(*[${filter}])
  }`
  return fetchSanity(query, true, { processNeedAccess: false })
}

export interface FetchInstructorLessonsOptions {
  sortOrder?: string
  searchTerm?: string
  page?: number
  limit?: number
  includedFields?: Array<string>
}

export interface InstructorLessonsResponse {
  entity: InstructorLesson[]
  total: number
}

export interface InstructorLesson {
  artist: string | null
  artist_name: string
  brand: string
  child_count: number | null
  difficulty: number | null
  difficulty_string: string | null
  genre: string | null
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
  type: string
  need_access: boolean
  page_type: string
}

/**
 * Fetch the data needed for the instructor screen.
 * @param {string} brand - The brand for which to fetch instructor lessons
 * @param {string} slug - The slug of the instructor
 *
 * @param {FetchInstructorLessonsOptions} options - Parameters for pagination, filtering and sorting.
 * @param {string} [options.sortOrder="-published_on"] - The field to sort the lessons by.
 * @param {string} [options.searchTerm=""] - The search term to filter content by title.
 * @param {number} [options.page=1] - The page number for pagination.
 * @param {number} [options.limit=10] - The number of items per page.
 * @param {Array<string>} [options.includedFields=[]] - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock'].
 *
 * @returns {Promise<InstructorLessonsResponse>} - The lessons for the instructor or null if not found.
 * @example
 * fetchInstructorLessons('instructor123')
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchInstructorLessons(
  slug: string,
  brand: string,
  {
    sortOrder = '-published_on',
    searchTerm = '',
    page = 1,
    limit = 20,
    includedFields = [],
  }: FetchInstructorLessonsOptions = {}
): Promise<InstructorLessonsResponse> {
  const fieldsString = getFieldsForContentType() as string
  const start = (page - 1) * limit
  const end = start + limit
  const searchFilter = searchTerm ? `&& title match "${searchTerm}*"` : ''
  const includedFieldsFilter = includedFields.length > 0 ? filtersToGroq(includedFields) : ''
  const filter = `brand == '${brand}' ${searchFilter} ${includedFieldsFilter} && references(*[_type=='instructor' && slug.current == '${slug}']._id)`
  const filterWithRestrictions = await new FilterBuilder(filter).buildFilter()

  sortOrder = getSortOrder(sortOrder, brand)
  const query = buildEntityAndTotalQuery(filterWithRestrictions, fieldsString, {
    sortOrder: sortOrder,
    start: start,
    end: end,
  })
  return fetchSanity(query, true)
}
