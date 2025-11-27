/**
 * @module Instructor
 */
import { filtersToGroq, getFieldsForContentType } from '../../contentTypeConfig.js'
import { FilterBuilder } from '../../filterBuilder.js'
import { ContentClient } from '../../infrastructure/sanity/clients/ContentClient'
import { Brand } from '../../lib/brands'
import { DocumentType } from '../../lib/contentTypes'
import { buildDataAndTotalQuery, getSortOrder } from '../../lib/sanity/query'
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
 * @param {Brand} brand - The brand for which to fetch instructors.
 * @returns {Promise<Instructor[]>} - A promise that resolves to an array of instructor objects.
 *
 * @example
 * fetchInstructors('drumeo')
 *   .then(instructors => console.log(instructors))
 *   .catch(error => console.error(error));
 */
export async function fetchInstructors(brand: Brand): Promise<Instructor[]> {
  const filter = await new FilterBuilder(`brand == "${brand}" && references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  return contentClient.fetchByTypeAndBrand<Instructor>(DocumentType.Instructor, brand, {
    fields: [
      'name',
      `'slug': slug.current`,
      `'thumbnail': thumbnail_url.asset->url`,
      `'lessonCount': count(*[${filter}])`,
    ],
  })
}

/**
 * Fetch a single instructor by their name
 *
 * @param {string} slug - The slug of the instructor to fetch.
 * @param {Brand} [brand] - The brand for which to fetch the instructor. Lesson count will be filtered by this brand if provided.
 * @returns {Promise<Instructor | null>} - A promise that resolves to an instructor object or null if not found.
 *
 * @example
 * fetchInstructorBySlug('66samus', 'drumeo')
 *   .then(instructor => console.log(instructor))
 *   .catch(error => console.error(error));
 */
export async function fetchInstructorBySlug(
  slug: string,
  brand?: Brand
): Promise<Instructor | null> {
  const brandFilter = brand ? `brand == "${brand}" && ` : ''
  const filter = await new FilterBuilder(`${brandFilter} references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  const query = `
    *[_type == "${DocumentType.Instructor}" && slug.current == '${slug}'][0] {
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

export interface InstructorLessonsResponse {
  data: Lesson[]
  total: number
}

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
 * @returns {Promise<InstructorLessonsResponse>} - The lessons for the instructor or null if not found.
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
  const addType = contentType ? `_type == '${contentType}' && ` : ''
  const filter = `${addType} brand == '${brand}' ${searchFilter} ${includedFieldsFilter} && references(*[_type=='${DocumentType.Instructor}' && slug.current == '${slug}']._id)`
  const filterWithRestrictions = await new FilterBuilder(filter).buildFilter()

  sortOrder = getSortOrder(sortOrder, brand)
  const query = buildDataAndTotalQuery(filterWithRestrictions, fieldsString, {
    sort: sortOrder,
    start: start,
    end: end,
  })

  return contentClient
    .fetchRaw<InstructorLessonsResponse>(query)
    .then((res) => res || { data: [], total: 0 })
}
