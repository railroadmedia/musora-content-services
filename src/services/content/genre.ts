/**
 * @module Genre
 */
import { filtersToGroq, getFieldsForContentType } from '../../contentTypeConfig.js'
import { Either } from '../../core/types/ads/either'
import { FilterBuilder } from '../../filterBuilder.js'
import { ContentClient } from '../../infrastructure/sanity/clients/ContentClient'
import { SanityListResponse } from '../../infrastructure/sanity/interfaces/SanityResponse'
import { SanityError } from '../../infrastructure/sanity/interfaces/SanityError'
import { Brands } from '../../lib/brands'
import { DocumentTypes } from '../../lib/documents'
import { getSortOrder } from '../../lib/sanity/query'
import { Lesson } from './content'

const contentClient = new ContentClient()

export interface Genre {
  name: string
  slug: string
  lessons_count: number
  thumbnail: string
}

/**
 * Fetch all genres with lessons available for a specific brand.
 *
 * @param {string} [brand] - The brand for which to fetch the genre for. Lesson count will be filtered by this brand if provided.
 * @returns {Promise<Genre[]>} - A promise that resolves to an genre object or null if not found.
 *
 * @example
 * fetchGenres('drumeo')
 *   .then(genres => console.log(genres))
 *   .catch(error => console.error(error));
 */
export async function fetchGenres(
  brand: Brands
): Promise<Either<SanityError, SanityListResponse<Genre>>> {
  const filter = await new FilterBuilder(`brand == "${brand}" && references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  return contentClient.fetchByTypeAndBrand<Genre>(DocumentTypes.Genre, brand, {
    fields: [
      `name`,
      `'slug': slug.current`,
      `'thumbnail': thumbnail_url.asset->url`,
      `'lessons_count': count(*[${filter}])`,
    ],
    paginated: false,
  })
}

/**
 * Fetch a single genre by their slug and brand
 *
 * @param {string} slug - The slug of the genre to fetch.
 * @param {Brands} [brand] - The brand for which to fetch the genre. Lesson count will be filtered by this brand if provided.
 * @returns {Promise<Genre[]|null>} - A promise that resolves to an genre object or null if not found.
 *
 * @example
 * fetchGenreBySlug('drumeo')
 *   .then(genres => console.log(genres))
 *   .catch(error => console.error(error));
 */
export async function fetchGenreBySlug(
  slug: string,
  brand?: Brands
): Promise<Either<SanityError, Genre | null>> {
  const brandFilter = brand ? `brand == "${brand}" && ` : ''
  const filter = await new FilterBuilder(`${brandFilter} references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  const query = `
  *[_type == '${DocumentTypes.Genre}' && slug.current == '${slug}'] {
    name,
    "slug": slug.current,
    'thumbnail':thumbnail_url.asset->url,
    "lessonsCount": count(*[${filter}])
  }`
  return contentClient.fetchSingle<Genre>(query)
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
  data: Lesson[]
  total: number
}

/**
 * Fetch the genre's lessons.
 * @param {string} slug - The slug of the genre
 * @param {Brands} brand - The brand for which to fetch lessons.
 * @param {DocumentTypes} contentType - The content type to filter lessons by.
 * @param {Object} params - Parameters for sorting, searching, pagination and filtering.
 * @param {string} [params.sort="-published_on"] - The field to sort the lessons by.
 * @param {string} [params.searchTerm=""] - The search term to filter the lessons.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @param {Array<string>} [params.includedFields=[]] - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock'].
 * @param {Array<number>} [params.progressIds=[]] - The ids of the lessons that are in progress or completed
 * @returns {Promise<LessonsByGenreResponse>} - The lessons for the genre
 *
 * @example
 * fetchGenreLessons('Blues', 'drumeo', 'song', {'-published_on', '', 1, 10, ["difficulty,Intermediate"], [232168, 232824, 303375, 232194, 393125]})
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchGenreLessons(
  slug: string,
  brand: Brands,
  contentType?: DocumentTypes,
  {
    sort = '-published_on',
    searchTerm = '',
    page = 1,
    limit = 10,
    includedFields = [],
    progressIds = [],
  }: FetchGenreLessonsOptions = {}
): Promise<Either<SanityError, LessonsByGenreResponse>> {
  const fieldsString = getFieldsForContentType(contentType) as string
  const start = (page - 1) * limit
  const end = start + limit
  const searchFilter = searchTerm ? `&& title match "${searchTerm}*"` : ''
  const includedFieldsFilter = includedFields.length > 0 ? filtersToGroq(includedFields) : ''
  const addType = contentType ? `_type == '${contentType}' && ` : ''
  const progressFilter =
    progressIds.length > 0 ? `&& railcontent_id in [${progressIds.join(',')}]` : ''
  const filter = `${addType} brand == '${brand}' ${searchFilter} ${includedFieldsFilter} && references(*[_type=='${DocumentTypes.Genre}' && slug.current == '${slug}']._id) ${progressFilter}`
  const filterWithRestrictions = await new FilterBuilder(filter).buildFilter()
  sort = getSortOrder(sort, brand)

  return contentClient
    .fetchList<Lesson>(filterWithRestrictions, fieldsString, {
      sort,
      start,
      end,
      paginated: false,
    })
    .then((res) => res.map((r) => r || { data: [], total: 0 }))
}
