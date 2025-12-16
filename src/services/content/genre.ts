/**
 * @module Genre
 */
import { getFieldsForContentType } from '../../contentTypeConfig.js'
import { fetchSanity, getSortOrder } from '../sanity.js'
import { Lesson } from './content'
import { BuildQueryOptions, query } from '../../lib/sanity/query'
import { Brands } from '../../lib/brands'
import { Filters as f } from '../../lib/sanity/filter'

export interface Genre {
  name: string
  slug: string
  thumbnail: string
  lesson_count: number
}

export interface Genres {
  data: Genre[]
  total: number
}

/**
 * Fetch all genres with lessons available for a specific brand.
 *
 * @param {Brands|string} [brand] - The brand for which to fetch the genre for. Lesson count will be filtered by this brand if provided.
 * @returns {Promise<Genre[]>} - A promise that resolves to an genre object or null if not found.
 *
 * @example
 * fetchGenres('drumeo')
 *   .then(genres => console.log(genres))
 *   .catch(error => console.error(error));
 */
export async function fetchGenres(
  brand: Brands | string,
  options: BuildQueryOptions
): Promise<Genres> {
  const lesson = f.combine(f.brand(brand), f.referencesParent())
  const type = f.type('genre')
  const lessonCount = `count(*[${lesson}])`
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
      `"lesson_count": ${lessonCount}`
    )
    .postFilter(postFilter)
    .build()

  const q = `{
    "data": ${data},
  }`

  return fetchSanity(q, true, { processNeedAccess: false, processPageType: false })
}

/**
 * Fetch a single genre by their slug and brand
 *
 * @param {string} slug - The slug of the genre to fetch.
 * @param {Brands|string} [brand] - The brand for which to fetch the genre. Lesson count will be filtered by this brand if provided.
 * @returns {Promise<Genre | null>} - A promise that resolves to an genre object or null if not found.
 *
 * @example
 * fetchGenreBySlug('drumeo')
 *   .then(genres => console.log(genres))
 *   .catch(error => console.error(error));
 */
export async function fetchGenreBySlug(
  slug: string,
  brand?: Brands | string
): Promise<Genre | null> {
  const filter = f.combine(brand ? f.brand(brand) : f.empty, f.referencesParent())

  const q = query()
    .and(f.type('genre'))
    .and(f.slug(slug))
    .select(
      'name',
      `"slug": slug.current`,
      `"thumbnail": thumbnail_url.asset->url`,
      `"lesson_count": count(*[${filter}])`
    )
    .first()
    .build()

  return fetchSanity(q, true, { processNeedAccess: false, processPageType: false })
}

export interface GenreLessonsOptions extends BuildQueryOptions {
  searchTerm?: string
  includedFields?: Array<string>
  progressIds?: Array<number>
}

export interface GenreLessons {
  data: Lesson[]
  total: number
}

/**
 * Fetch the genre's lessons.
 * @param {string} slug - The slug of the genre
 * @param {Brands|string} brand - The brand for which to fetch lessons.
 * @param {Object} params - Parameters for sorting, searching, pagination and filtering.
 * @param {string} [params.sort="-published_on"] - The field to sort the lessons by.
 * @param {string} [params.searchTerm=""] - The search term to filter the lessons.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @param {Array<string>} [params.includedFields=[]] - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock'].
 * @param {Array<number>} [params.progressIds=[]] - The ids of the lessons that are in progress or completed
 * @returns {Promise<GenreLessons|null>} - The lessons for the genre
 *
 * @example
 * fetchGenreLessons('Blues', 'drumeo', 'song', {'-published_on', '', 1, 10, ["difficulty,Intermediate"], [232168, 232824, 303375, 232194, 393125]})
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchGenreLessons(
  slug: string,
  brand: Brands | string,
  contentType?: string,
  {
    sort = '-published_on',
    searchTerm = '',
    offset = 0,
    limit = 10,
    includedFields = [],
    progressIds = [],
  }: GenreLessonsOptions = {}
): Promise<GenreLessons> {
  sort = getSortOrder(sort, brand)

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
    .order(sort)
    .slice(offset, limit)
    .select(getFieldsForContentType(contentType) as string)
    .build()

  const total = query().and(restrictions).build()

  const q = `{
    "data": ${data},
    "total": count(${total})
  }`

  return fetchSanity(q, true, { processNeedAccess: true, processPageType: false })
}
