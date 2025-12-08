/**
 * @module Genre
 */
import { filtersToGroq, getFieldsForContentType } from '../../contentTypeConfig.js'
import { fetchSanity, getSortOrder } from '../sanity.js'
import { FilterBuilder } from '../../filterBuilder.js'
import { Lesson } from './content'
import { BuildQueryOptions, query } from '../../lib/sanity/query'
import { Brands } from '../../lib/brands'

export interface Genre {
  name: string
  slug: string
  lessons_count: number
  thumbnail: string
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
  options: BuildQueryOptions = { sort: 'lower(name) asc' }
): Promise<Genre[]> {
  const lessonFilter = await new FilterBuilder(`brand == "${brand}" && references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  const data = query()
    .and(`_type == "genre"`)
    .order(options.sort || 'lower(name) asc')
    .slice(options.offset || 0, (options.offset || 0) + (options.limit || 20))
    .select(
      'name',
      `"slug": slug.current`,
      `"thumbnail": thumbnail_url.asset->url`,
      `"lessons_count": count(*[${lessonFilter}])`
    )
    .postFilter(`lessons_count > 0`)
    .build()

  const total = query()
    .and(`_type == "genre"`)
    .select(`"lessons_count": count(*[${lessonFilter}])`)
    .postFilter(`lessons_count > 0`)
    .build()

  const q = `{
    "data": ${data},
    "total": ${total}
  }`

  return fetchSanity(q, true, { processNeedAccess: false, processPageType: false })
}

export interface GenreBySlug {
  data: Genre | null
}

/**
 * Fetch a single genre by their slug and brand
 *
 * @param {string} slug - The slug of the genre to fetch.
 * @param {Brands|string} [brand] - The brand for which to fetch the genre. Lesson count will be filtered by this brand if provided.
 * @returns {Promise<GenreBySlug>} - A promise that resolves to an genre object or null if not found.
 *
 * @example
 * fetchGenreBySlug('drumeo')
 *   .then(genres => console.log(genres))
 *   .catch(error => console.error(error));
 */
export async function fetchGenreBySlug(
  slug: string,
  brand?: Brands | string
): Promise<GenreBySlug> {
  const brandFilter = brand ? `brand == "${brand}" && ` : ''
  const filter = await new FilterBuilder(`${brandFilter} references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  const q = query()
    .and(`_type == "genre"`)
    .and(`slug.current == "${slug}"`)
    .select(
      'name',
      `"slug": slug.current`,
      `"thumbnail": thumbnail_url.asset->url`,
      `"lessons_count": count(*[${filter}])`
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
    offset = 1,
    limit = 10,
    includedFields = [],
    progressIds = [],
  }: GenreLessonsOptions = {}
): Promise<GenreLessons> {
  const fieldsString = getFieldsForContentType(contentType) as string
  const searchFilter = searchTerm ? `&& title match "${searchTerm}*"` : ''
  const includedFieldsFilter = includedFields.length > 0 ? filtersToGroq(includedFields) : ''
  const addType = contentType ? `_type == '${contentType}' && ` : ''
  const progressFilter =
    progressIds.length > 0 ? `&& railcontent_id in [${progressIds.join(',')}]` : ''
  const filter = `${addType} brand == '${brand}' ${searchFilter} ${includedFieldsFilter} && references(*[_type=='genre' && slug.current == '${slug}']._id) ${progressFilter}`
  const filterWithRestrictions = await new FilterBuilder(filter).buildFilter()

  sort = getSortOrder(sort, brand)
  const data = query()
    .and(filterWithRestrictions)
    .and(`brand == ${brand}`)
    .order(sort)
    .slice(offset, offset + limit)
    .select(...(fieldsString ? [fieldsString] : []))
    .build()

  const total = query().and(filterWithRestrictions).build()

  const q = `{
    "data": ${data},
    "total": ${total}
  }`

  return fetchSanity(q, true, { processNeedAccess: false, processPageType: false })
}
