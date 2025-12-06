/**
 * @module Artist
 */
import { filtersToGroq, getFieldsForContentType } from '../../contentTypeConfig.js'
import { FilterBuilder } from '../../filterBuilder.js'
import { buildDataAndTotalQuery, BuildQueryOptions, QueryHelper } from '../../lib/sanity/query'
import { fetchSanity, getSortOrder } from '../sanity.js'
import { Lesson } from './content'
import { Brands } from '../../lib/brands'

export interface Artist {
  slug: string
  name: string
  thumbnail: string
  lessonCount: number
}

/**
 * Fetch all artists with lessons available for a specific brand.
 *
 * @param {Brands|string} brand - The brand for which to fetch artists.
 * @returns {Promise<Artist[]|null>} - A promise that resolves to an array of artist objects or null if not found.
 *
 * @example
 * fetchArtists('drumeo')
 *   .then(artists => console.log(artists))
 *   .catch(error => console.error(error));
 */
export async function fetchArtists(
  brand: Brands | string,
  options: BuildQueryOptions = { sort: 'lower(name) asc' }
): Promise<Artist[] | null> {
  const lessonFilter = await new FilterBuilder(`brand == "${brand}" && references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  const filter = `*[_type == "artist"]`

  const query = `
  {
    "data": ${filter} {
      name,
      "slug": slug.current,
      'thumbnail': thumbnail_url.asset->url,
      "lessonCount": count(*[${lessonFilter}])
    } [lessonCount > 0]
    | ${QueryHelper.sort(options)} ${QueryHelper.paginate(options)},
    "total": count(${filter} {
        "lessonCount": count(*[${lessonFilter}])
      } [lessonCount > 0]
    )
  }`
  return fetchSanity(query, true, { processNeedAccess: false, processPageType: false })
}

/**
 * Fetch a single artist by their Sanity ID.
 *
 * @param {string} slug - The name of the artist to fetch.
 * @param {Brands|string} [brand] - The brand for which to fetch the artist.
 * @returns {Promise<Artist|null>} - A promise that resolves to an artist objects or null if not found.
 *
 * @example
 * fetchArtists('drumeo')
 *   .then(artists => console.log(artists))
 *   .catch(error => console.error(error));
 */
export async function fetchArtistBySlug(
  slug: string,
  brand?: Brands | string
): Promise<Artist | null> {
  const brandFilter = brand ? `brand == "${brand}" && ` : ''
  const filter = await new FilterBuilder(`${brandFilter} _type == "song" && references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()
  const query = `
  {
    "data": *[_type == "artist" && slug.current == '${slug}'][0] {
      name,
      "slug": slug.current,
      "lessonCount": count(*[${filter}])
    }
  }`
  return fetchSanity(query, true, { processNeedAccess: false, processPageType: false })
}

export interface ArtistLessonOptions extends BuildQueryOptions {
  searchTerm?: string
  includedFields?: Array<string>
  progressIds?: Array<number>
}

export interface LessonsByArtistResponse {
  data: Lesson[]
  total: number
}

/**
 * Fetch the artist's lessons.
 * @param {string} slug - The slug of the artist
 * @param {Brands|string} brand - The brand for which to fetch lessons.
 * @param {string} contentType - The type of the lessons we need to get from the artist. If not defined, groq will get lessons from all content types
 * @param {Object} params - Parameters for sorting, searching, pagination and filtering.
 * @param {string} [params.sort="-published_on"] - The field to sort the lessons by.
 * @param {string} [params.searchTerm=""] - The search term to filter the lessons.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @param {Array<string>} [params.includedFields=[]] - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock'].
 * @param {Array<number>} [params.progressId=[]] - The ids of the lessons that are in progress or completed
 * @returns {Promise<LessonsByArtistResponse|null>} - The lessons for the artist
 *
 * @example
 * fetchArtistLessons('10 Years', 'drumeo', 'song', {'-published_on', '', 1, 10, ["difficulty,Intermediate"], [232168, 232824, 303375, 232194, 393125]})
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchArtistLessons(
  slug: string,
  brand: Brands | string,
  contentType: string,
  {
    sort = '-published_on',
    searchTerm = '',
    offset = 1,
    limit = 10,
    includedFields = [],
    progressIds = [],
    paginated = false,
  }: ArtistLessonOptions = {}
): Promise<LessonsByArtistResponse | null> {
  const fieldsString = getFieldsForContentType(contentType) as string
  const searchFilter = searchTerm ? `&& title match "${searchTerm}*"` : ''
  const includedFieldsFilter = includedFields.length > 0 ? filtersToGroq(includedFields) : ''
  const addType = contentType ? `_type == '${contentType}' && ` : ''
  const progressFilter =
    progressIds.length > 0 ? `&& railcontent_id in [${progressIds.join(',')}]` : ''
  const filter = `${addType} brand == '${brand}' ${searchFilter} ${includedFieldsFilter} && references(*[_type=='artist' && slug.current == '${slug}']._id) ${progressFilter}`
  const filterWithRestrictions = await new FilterBuilder(filter).buildFilter()

  sort = getSortOrder(sort, brand)
  const query = buildDataAndTotalQuery(filterWithRestrictions, fieldsString, {
    sort,
    offset,
    limit,
    paginated,
  })
  return fetchSanity(query, true, { processNeedAccess: false, processPageType: false })
}
