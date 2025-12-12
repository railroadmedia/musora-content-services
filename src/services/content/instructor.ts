/**
 * @module Instructor
 */

import { ContentClient } from '../../infrastructure/sanity/clients/ContentClient'
import { getFieldsForContentType } from '../../contentTypeConfig.js'
import { getSortOrder } from '../sanity.js'
import { Lesson } from './content'
import { BuildQueryOptions, query } from '../../lib/sanity/query'
import { Brand } from '../../lib/brands'
import { Filters as f } from '../../lib/sanity/filter'
import { SanityListResponse } from '../../infrastructure/sanity/interfaces/SanityResponse'

const contentClient = new ContentClient()

export interface Instructor {
  lessonCount: number
  slug: string
  name: string
  short_bio?: string
  thumbnail: string
}

export type Instructors = SanityListResponse<Instructor>

/**
 * Fetch all instructor with lessons available for a specific brand.
 *
 * @param {Brand|string} brand - The brand for which to fetch instructors.
 * @returns {Promise<Instructors>} - A promise that resolves to an array of instructor objects.
 *
 * @example
 * fetchInstructors('drumeo')
 *   .then(instructors => console.log(instructors))
 *   .catch(error => console.error(error));
 */
export async function fetchInstructors(
  brand: Brand | string,
  options: BuildQueryOptions = {
    sort: 'lower(name) asc',
    offset: 0,
    limit: 20,
  }
): Promise<Instructors> {
  const type = f.type('instructor')
  const lesson = f.combine(f.brand(brand), f.referencesParent())
  const lessonCount = `count(*[${lesson}])`
  const postFilter = `lessonCount > 0`

  const data = query()
    .and(type)
    .order(getSortOrder(options?.sort || 'lower(name) asc', brand as Brand))
    .slice(options?.offset || 0, options?.limit || 20)
    .select(
      'name',
      `"slug": slug.current`,
      `"thumbnail": thumbnail_url.asset->url`,
      `"lessonCount": ${lessonCount}`
    )
    .postFilter(postFilter)
    .build()

  const total = query()
    .and(type)
    .select(`"lessonCount": ${lessonCount}`)
    .postFilter(postFilter)
    .build()

  const q = `{
    "data": ${data},
    "total": count(${total})
  }`

  return contentClient.fetchList<Instructor>(q, options)
}

/**
 * Fetch a single instructor by their name
 *
 * @param {string} slug - The slug of the instructor to fetch.
 * @param {Brand|string} [brand] - The brand for which to fetch the instructor. Lesson count will be filtered by this brand if provided.
 * @returns {Promise<Instructor | null>} - A promise that resolves to an instructor object or null if not found.
 *
 * @example
 * fetchInstructorBySlug('66samus', 'drumeo')
 *   .then(instructor => console.log(instructor))
 *   .catch(error => console.error(error));
 */
export async function fetchInstructorBySlug(
  slug: string,
  brand?: Brand | string
): Promise<Instructor | null> {
  const filter = f.combine(brand ? f.brand(brand) : f.empty, f.referencesParent())

  const q = query()
    .and(f.type('instructor'))
    .and(f.slug(slug))
    .select(
      'name',
      `"slug": slug.current`,
      'short_bio',
      `"thumbnail": thumbnail_url.asset->url`,
      `"lessonCount": count(*[${filter}])`
    )
    .first()
    .build()

  return contentClient.fetchSingle<Instructor>(q)
}

export interface InstructorLessonsOptions extends BuildQueryOptions {
  searchTerm?: string
  page?: number
  limit?: number
  includedFields?: string[]
}

export type InstructorLessons = SanityListResponse<Lesson>

/**
 * Fetch the data needed for the instructor screen.
 * @param {string} slug - The slug of the instructor
 * @param {Brand|string} brand - The brand for which to fetch instructor lessons
 * @param {DocumentType} contentType - The content type to filter lessons by.
 * @param {FetchInstructorLessonsOptions} options - Parameters for pagination, filtering and sorting.
 * @param {string} [options.sortOrder="-published_on"] - The field to sort the lessons by.
 * @param {string} [options.searchTerm=""] - The search term to filter content by title.
 * @param {number} [options.page=1] - The page number for pagination.
 * @param {number} [options.limit=10] - The number of items per page.
 * @param {Array<string>} [options.includedFields=[]] - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock'].
 *
 * @returns {Promise<InstructorLessons>} - The lessons for the instructor or null if not found.
 * @example
 * fetchInstructorLessons('instructor123')
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchInstructorLessons(
  slug: string,
  brand: Brand | string,
  contentType: DocumentType,
  {
    sort = '-published_on',
    searchTerm = '',
    offset = 0,
    limit = 20,
    includedFields = [],
  }: InstructorLessonsOptions = {}
): Promise<InstructorLessons> {
  sort = getSortOrder(sort, brand as Brand)

  const restrictions = await f.combineAsync(
    f.contentFilter(),
    f.referencesIDWithFilter(f.combine(f.type('instructor'), f.slug(slug)))
  )

  const data = query()
    .and(f.brand(brand))
    .and(f.searchMatch('title', searchTerm))
    .and(f.includedFields(includedFields))
    .and(restrictions)
    .order(sort)
    .slice(offset, limit)
    .select(getFieldsForContentType(contentType) as string)
    .build()

  const total = query().and(restrictions).build()

  const q = `{
    "data": ${data},
    "total": count(${total})
  }`

  return contentClient.fetchList<Lesson>(q, {
    sort,
    offset,
    limit,
  })
}
