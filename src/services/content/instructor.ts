/**
 * @module Instructor
 */
import { filtersToGroq, getFieldsForContentType } from '../../contentTypeConfig.js'
import { Either } from '../../core/types/ads/either'
import { FilterBuilder } from '../../filterBuilder.js'
import { ContentClient } from '../../infrastructure/sanity/clients/ContentClient'
import { SanityListResponse } from '../../infrastructure/sanity/interfaces/SanityResponse.js'
import { SanityError } from '../../infrastructure/sanity/interfaces/SanityError'
import { Brands } from '../../lib/brands'
import { DocumentTypes } from '../../lib/documents'
import { getSortOrder } from '../../lib/sanity/query'
import { Lesson } from './content'

const contentClient = new ContentClient()

export interface Instructor {
  lessonCount: number
  slug: string
  name: string
  short_bio?: string
  thumbnail: string
}

/**
 * Fetch all instructor with lessons available for a specific brand.
 *
 * @param {Brands|string} brand - The brand for which to fetch instructors.
 * @returns {Promise<Either<SanityError, SanityListResponse<Instructor>>>} - A promise that resolves to an array of instructor objects.
 *
 * @example
 * fetchInstructors('drumeo')
 *   .then(instructors => console.log(instructors))
 *   .catch(error => console.error(error));
 */
export async function fetchInstructors(
  brand: Brands | string
): Promise<Either<SanityError, SanityListResponse<Instructor>>> {
  const filter = await new FilterBuilder(`brand == "${brand}" && references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  return contentClient.fetchByTypeAndBrand<Instructor>(DocumentTypes.Instructor, brand, {
    fields: [
      'name',
      `'slug': slug.current`,
      `'thumbnail': thumbnail_url.asset->url`,
      `'lessonCount': count(*[${filter}])`,
    ],
    paginated: false,
  })
}

/**
 * Fetch a single instructor by their name
 *
 * @param {string} slug - The slug of the instructor to fetch.
 * @param {Brands|string} [brand] - The brand for which to fetch the instructor. Lesson count will be filtered by this brand if provided.
 * @returns {Promise<Either<SanityError, Instructor | null>>} - A promise that resolves to an instructor object or null if not found.
 *
 * @example
 * fetchInstructorBySlug('66samus', 'drumeo')
 *   .then(instructor => console.log(instructor))
 *   .catch(error => console.error(error));
 */
export async function fetchInstructorBySlug(
  slug: string,
  brand?: Brands | string
): Promise<Either<SanityError, Instructor | null>> {
  const brandFilter = brand ? `brand == "${brand}" && ` : ''
  const filter = await new FilterBuilder(`${brandFilter} references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  const query = `
    *[_type == "${DocumentTypes.Instructor}" && slug.current == '${slug}'][0] {
      name,
      "slug": slug.current,
      short_bio,
      'thumbnail': thumbnail_url.asset->url,
      "lessonCount": count(*[${filter}])
    }
  `
  return contentClient.fetchSingle<Instructor>(query)
}

export interface FetchInstructorLessonsOptions {
  sortOrder?: string
  searchTerm?: string
  page?: number
  limit?: number
  includedFields?: string[]
}

/**
 * Fetch the data needed for the instructor screen.
 * @param {string} slug - The slug of the instructor
 * @param {Brands|string} brand - The brand for which to fetch instructor lessons
 * @param {DocumentTypes} contentType - The content type to filter lessons by.
 * @param {FetchInstructorLessonsOptions} options - Parameters for pagination, filtering and sorting.
 * @param {string} [options.sortOrder="-published_on"] - The field to sort the lessons by.
 * @param {string} [options.searchTerm=""] - The search term to filter content by title.
 * @param {number} [options.page=1] - The page number for pagination.
 * @param {number} [options.limit=10] - The number of items per page.
 * @param {Array<string>} [options.includedFields=[]] - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock'].
 *
 * @returns {Promise<Either<SanityError, SanityListResponse<Lesson>>>} - The lessons for the instructor or null if not found.
 * @example
 * fetchInstructorLessons('instructor123')
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchInstructorLessons(
  slug: string,
  brand: Brands | string,
  contentType: DocumentTypes,
  {
    sortOrder: sort = '-published_on',
    searchTerm = '',
    page = 1,
    limit = 20,
    includedFields = [],
  }: FetchInstructorLessonsOptions = {}
): Promise<Either<SanityError, SanityListResponse<Lesson>>> {
  const fieldsString = getFieldsForContentType() as string
  const start = (page - 1) * limit
  const end = start + limit
  const searchFilter = searchTerm ? `&& title match "${searchTerm}*"` : ''
  const includedFieldsFilter = includedFields.length > 0 ? filtersToGroq(includedFields) : ''
  const addType = contentType ? `_type == '${contentType}' && ` : ''
  const filter = `${addType} brand == '${brand}' ${searchFilter} ${includedFieldsFilter} && references(*[_type=='${DocumentTypes.Instructor}' && slug.current == '${slug}']._id)`
  const filterWithRestrictions = await new FilterBuilder(filter).buildFilter()
  sort = getSortOrder(sort, brand as Brands)

  return contentClient.fetchList<Lesson>(filterWithRestrictions, fieldsString, {
    sort,
    start,
    end,
    paginated: false,
  })
}
