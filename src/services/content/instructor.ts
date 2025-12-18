/**
 * @module Instructor
 */
import { Either } from '../../core/types/ads/either'
import { SanityError } from '../../infrastructure/sanity/interfaces/SanityError'
import { SanityListResponse } from '../../infrastructure/sanity/interfaces/SanityResponse'
import { Brand } from '../../lib/brands'
import { DocumentType } from '../../lib/documents'
import { getSortOrder } from '../../lib/sanity/query'
import { getFieldsForContentType } from '../../contentTypeConfig.js'
import { SanityClient } from '../../infrastructure/sanity/SanityClient'
import { Filters as f } from '../../lib/sanity/filter'
import { BuildQueryOptions, query } from '../../lib/sanity/query'
import { getPermissionsAdapter } from '../permissions/PermissionsAdapterFactory.js'
import { needsAccessDecorator } from '../sanity.js'
import { Lesson } from './content'

const contentClient = new SanityClient()

export interface Instructor {
  lesson_count: number
  slug: string
  name: string
  short_bio?: string
  thumbnail: string
}

export interface Instructors extends SanityListResponse<Instructor> {}

/**
 * Fetch all instructor with lessons available for a specific brand.
 *
 * @param {Brand} brand - The brand for which to fetch instructors.
 * @returns {Promise<Either<SanityError, Instructors>>} - A promise that resolves to an array of instructor objects.
 *
 * @example
 * fetchInstructors('drumeo')
 *   .then(instructors => console.log(instructors))
 *   .catch(error => console.error(error));
 */
export async function fetchInstructors(
  brand: Brand,
  options: BuildQueryOptions
): Promise<Either<SanityError, SanityListResponse<Instructor>>> {
  const type = f.type('instructor')
  const postFilter = `lesson_count > 0`
  const { sort = 'lower(name)', offset = 0, limit = 20 } = options

  const data = query()
    .and(type)
    .order(getSortOrder(sort, brand))
    .slice(offset, limit)
    .select(
      'name',
      `"slug": slug.current`,
      `"thumbnail": thumbnail_url.asset->url`,
      `"lesson_count": ${await f.lessonCount(brand)}`
    )
    .postFilter(postFilter)
    .build()

  const q = `{
    "data": ${data},
  }`

  return contentClient.fetchList<Instructor>(q, options)
}

/**
 * Fetch a single instructor by their name
 *
 * @param {string} slug - The slug of the instructor to fetch.
 * @param {Brand} [brand] - The brand for which to fetch the instructor. Lesson count will be filtered by this brand if provided.
 * @returns {Promise<Either<SanityError, Instructor | null>>} - A promise that resolves to an instructor object or null if not found.
 *
 * @example
 * fetchInstructorBySlug('66samus', 'drumeo')
 *   .then(instructor => console.log(instructor))
 *   .catch(error => console.error(error));
 */
export async function fetchInstructorBySlug(
  slug: string,
  brand?: Brand
): Promise<Either<SanityError, Instructor | null>> {
  const q = query()
    .and(f.type('instructor'))
    .and(f.slug(slug))
    .select(
      'name',
      `"slug": slug.current`,
      'short_bio',
      `"thumbnail": thumbnail_url.asset->url`,
      `"lesson_count": ${await f.lessonCount(brand)}`
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

export interface InstructorLessons extends SanityListResponse<Lesson> {}

/**
 * Fetch the data needed for the instructor screen.
 * @param {string} slug - The slug of the instructor
 * @param {Brand} brand - The brand for which to fetch instructor lessons
 * @param {DocumentType} contentType - The content type to filter lessons by.
 * @param {FetchInstructorLessonsOptions} options - Parameters for pagination, filtering and sorting.
 * @param {string} [options.sortOrder="-published_on"] - The field to sort the lessons by.
 * @param {string} [options.searchTerm=""] - The search term to filter content by title.
 * @param {number} [options.page=1] - The page number for pagination.
 * @param {number} [options.limit=10] - The number of items per page.
 * @param {Array<string>} [options.includedFields=[]] - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock'].
 *
 * @returns {Promise<Either<SanityError, InstructorLessons>>} - The lessons for the instructor or null if not found.
 * @example
 * fetchInstructorLessons('instructor123')
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchInstructorLessons(
  slug: string,
  brand: Brand,
  contentType: DocumentType,
  {
    sort = '-published_on',
    searchTerm = '',
    offset = 0,
    limit = 20,
    includedFields = [],
  }: InstructorLessonsOptions = {}
): Promise<Either<SanityError, InstructorLessons>> {
  sort = getSortOrder(sort, brand)

  const restrictions = await f.combineAsync(
    f.status(),
    f.publishedDate(),
    f.notDeprecated(),
    f.referencesIDWithFilter(f.combine(f.type('instructor'), f.slug(slug))),
    f.brand(brand),
    f.searchMatch('title', searchTerm),
    f.includedFields(includedFields)
  )

  const data = query()
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

  const [res, permissions] = await Promise.all([
    contentClient.fetchList<Lesson>(q, {
      sort,
      offset,
      limit,
    }),
    getPermissionsAdapter().fetchUserPermissions(),
  ])

  return res.map((l) => needsAccessDecorator(l, permissions))
}
