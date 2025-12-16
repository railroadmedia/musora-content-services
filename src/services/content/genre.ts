/**
 * @module Genre
 */
import { getFieldsForContentType } from '../../contentTypeConfig.js'
import { SanityListResponse } from '../../infrastructure/sanity/interfaces/SanityResponse'
import { SanityClient } from '../../infrastructure/sanity/SanityClient'
import { Brand } from '../../lib/brands'
import { DocumentType } from '../../lib/documents'
import { Filters as f } from '../../lib/sanity/filter'
import { BuildQueryOptions, getSortOrder, query } from '../../lib/sanity/query'
import { getPermissionsAdapter } from '../permissions'
import { needsAccessDecorator } from '../sanity.js'
import { Lesson } from './content'

const contentClient = new SanityClient()
export interface Genre {
  name: string
  slug: string
  thumbnail: string
  lesson_count: number
}

export interface Genres extends SanityListResponse<Genre> {}

/**
 * Fetch all genres with lessons available for a specific brand.
 *
 * @param {Brand} [brand] - The brand for which to fetch the genre for. Lesson count will be filtered by this brand if provided.
 * @returns {Promise<Genres>} - A promise that resolves to an genre object or null if not found.
 *
 * @example
 * fetchGenres('drumeo')
 *   .then(genres => console.log(genres))
 *   .catch(error => console.error(error));
 */
export async function fetchGenres(brand: Brand, options: BuildQueryOptions): Promise<Genres> {
  const type = f.type('genre')
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

  return contentClient.fetchList<Genre>(q, options)
}

/**
 * Fetch a single genre by their slug and brand
 *
 * @param {string} slug - The slug of the genre to fetch.
 * @param {Brand} [brand] - The brand for which to fetch the genre. Lesson count will be filtered by this brand if provided.
 * @returns {Promise<Genre|null>} - A promise that resolves to an genre object or null if not found.
 *
 * @example
 * fetchGenreBySlug('drumeo')
 *   .then(genres => console.log(genres))
 *   .catch(error => console.error(error));
 */
export async function fetchGenreBySlug(slug: string, brand?: Brand): Promise<Genre | null> {
  const q = query()
    .and(f.type('genre'))
    .and(f.slug(slug))
    .select(
      'name',
      `"slug": slug.current`,
      `"thumbnail": thumbnail_url.asset->url`,
      `"lesson_count": ${await f.lessonCount(brand)}`
    )
    .first()
    .build()

  return contentClient.fetchSingle<Genre>(q)
}

export interface GenreLessonsOptions extends BuildQueryOptions {
  searchTerm?: string
  includedFields?: Array<string>
  progressIds?: Array<number>
}

export interface GenreLessons extends SanityListResponse<Lesson> {}

/**
 * Fetch the genre's lessons.
 * @param {string} slug - The slug of the genre
 * @param {Brand} brand - The brand for which to fetch lessons.
 * @param {DocumentType} contentType - The content type to filter lessons by.
 * @param {Object} params - Parameters for sorting, searching, pagination and filtering.
 * @param {string} [params.sort="-published_on"] - The field to sort the lessons by.
 * @param {string} [params.searchTerm=""] - The search term to filter the lessons.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @param {Array<string>} [params.includedFields=[]] - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock'].
 * @param {Array<number>} [params.progressIds=[]] - The ids of the lessons that are in progress or completed
 * @returns {Promise<GenreLessons>} - The lessons for the genre
 *
 * @example
 * fetchGenreLessons('Blues', 'drumeo', 'song', {'-published_on', '', 1, 10, ["difficulty,Intermediate"], [232168, 232824, 303375, 232194, 393125]})
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchGenreLessons(
  slug: string,
  brand: Brand,
  contentType?: DocumentType,
  {
    sort = '-published_on',
    searchTerm = '',
    offset = 0,
    limit = 10,
    includedFields = [],
    progressIds = [],
  }: GenreLessonsOptions = {}
): Promise<GenreLessons> {
  const restrictions = await f.combineAsync(
    f.status(),
    f.publishedDate(),
    f.notDeprecated(),
    f.referencesIDWithFilter(f.combine(f.type('genre'), f.slug(slug))),
    f.brand(brand),
    f.searchMatch('title', searchTerm),
    f.includedFields(includedFields),
    f.progressIds(progressIds)
  )

  const data = query()
    .and(restrictions)
    .order(getSortOrder(sort, brand))
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

  return needsAccessDecorator(res, permissions)
}
