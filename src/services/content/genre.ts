/**
 * @module Genre
 */
import { getFieldsForContentType } from '../../contentTypeConfig.js'
import { ContentClient } from '../../infrastructure/sanity/clients/ContentClient'
import { SanityListResponse } from '../../infrastructure/sanity/interfaces/SanityResponse'
import { Brand } from '../../lib/brands'
import { DocumentType } from '../../lib/documents'
import { getSortOrder } from '../../lib/sanity/query'
import { Lesson } from './content'
import { BuildQueryOptions, query } from '../../lib/sanity/query'
import { Filters as f } from '../../lib/sanity/filter'

const contentClient = new ContentClient()
export interface Genre {
  name: string
  slug: string
  lessons_count: number
  thumbnail: string
}

export type Genres = SanityListResponse<Genre>

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
export async function fetchGenres(
  brand: Brand,
  options: BuildQueryOptions = {
    sort: 'lower(name) asc',
    offset: 0,
    limit: 20,
  }
): Promise<Genres> {
  const lesson = f.combine(f.brand(brand), f.referencesParent())
  const type = f.type('genre')
  const lessonCount = `count(*[${lesson}])`
  const postFilter = `lessonCount > 0`

  const data = query()
    .and(type)
    .order(getSortOrder(options.sort, brand))
    .slice(options?.offset || 0, options.limit)
    .select(
      'name',
      `"slug": slug.current`,
      `"thumbnail": thumbnail_url.asset->url`,
      `"lessons_count": ${lessonCount}`
    )
    .postFilter(postFilter)
    .build()

  const total = query()
    .and(type)
    .select(`"lessons_count": ${lessonCount}`)
    .postFilter(postFilter)
    .build()

  const q = `{
    "data": ${data},
    "total": count(${total})
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
  const filter = f.combine(brand ? f.brand(brand) : f.empty, f.referencesParent())

  const q = query()
    .and(f.type('genre'))
    .and(f.slug(slug))
    .select(
      'name',
      `"slug": slug.current`,
      `"thumbnail": thumbnail_url.asset->url`,
      `"lessons_count": count(*[${filter}])`
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

export type GenreLessons = SanityListResponse<Lesson>

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
    f.contentFilter(),
    f.referencesIDWithFilter(f.combine(f.type('genre'), f.slug(slug)))
  )

  const data = query()
    .and(f.brand(brand))
    .and(f.searchMatch('title', searchTerm))
    .and(f.includedFields(includedFields))
    .and(f.progressIds(progressIds))
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

  return contentClient.fetchList<Lesson>(q, {
    sort,
    offset,
    limit,
  })
}
