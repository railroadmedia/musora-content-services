/**
 * @module Artist
 */
import { filtersToGroq, getFieldsForContentType } from '../../contentTypeConfig.js'
import { FilterBuilder } from '../../filterBuilder.js'
import { ContentClient } from '../../infrastructure/sanity/clients/ContentClient'
import { SanityListResponse } from '../../infrastructure/sanity/interfaces/SanityResponse'
import { Brand } from '../../lib/brands'
import { DocumentType } from '../../lib/documents'
import { getSortOrder } from '../../lib/sanity/query'
import { BuildQueryOptions, query } from '../../lib/sanity/query'
import { Lesson } from './content'

const contentClient = new ContentClient()

export interface Artist {
  slug: string
  name: string
  thumbnail: string
  lessonCount: number
}

export interface Artists extends SanityListResponse<Artist> {}

/**
 * Fetch all artists with lessons available for a specific brand.
 *
 * @param {Brand|string} brand - The brand for which to fetch artists.
 * @returns {Promise<Artists>} - A promise that resolves to an array of artist objects or null if not found.
 *
 * @example
 * fetchArtists('drumeo')
 *   .then(artists => console.log(artists))
 *   .catch(error => console.error(error));
 */
export async function fetchArtists(
  brand: Brand | string,
  options: BuildQueryOptions = { sort: 'lower(name) asc' }
): Promise<Artists> {
  const lessonFilter = await new FilterBuilder(`brand == "${brand}" && references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  const data = query()
    .and(`_type == "${DocumentType.Artist}"`)
    .order(options?.sort || 'lower(name) asc')
    .slice(options?.offset || 0, (options?.offset || 0) + (options?.limit || 20))
    .select(
      'name',
      `"slug": slug.current`,
      `"thumbnail": thumbnail_url.asset->url`,
      `"lessonCount": count(*[${lessonFilter}])`
    )
    .postFilter(`lessonCount > 0`)
    .build()

  const total = query()
    .and(`_type == "artist"`)
    .select(`"lessonCount": count(*[${lessonFilter}])`)
    .postFilter(`lessonCount > 0`)
    .build()

  const q = `{
    "data": ${data},
    "total": count(${total})
  }`

  return contentClient.fetchList<Artist>(q, options)
}

/**
 * Fetch a single artist by their Sanity ID.
 *
 * @param {string} slug - The name of the artist to fetch.
 * @param {Brand|string} [brand] - The brand for which to fetch the artist.
 * @returns {Promise<Artist|null>} - A promise that resolves to an artist objects or null if not found.
 *
 * @example
 * fetchArtists('drumeo')
 *   .then(artists => console.log(artists))
 *   .catch(error => console.error(error));
 */
export async function fetchArtistBySlug(
  slug: string,
  brand?: Brand | string
): Promise<Artist | null> {
  const brandFilter = brand ? `brand == "${brand}" && ` : ''
  const filter = await new FilterBuilder(`${brandFilter} _type == "song" && references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()

  const q = query()
    .and(`_type == "artist"`)
    .and(`&& slug.current == '${slug}'`)
    .select(
      'name',
      `"slug": slug.current`,
      `"thumbnail": thumbnail_url.asset->url`,
      `"lessonCount": count(*[${filter}])`
    )
    .first()
    .build()

  return contentClient.fetchSingle<Artist>(q)
}

export interface ArtistLessonOptions extends BuildQueryOptions {
  searchTerm?: string
  includedFields?: Array<string>
  progressIds?: Array<number>
}

export interface ArtistLessons extends SanityListResponse<Lesson> {}

/**
 * Fetch the artist's lessons.
 * @param {string} slug - The slug of the artist
 * @param {Brand|string} brand - The brand for which to fetch lessons.
 * @param {DocumentType} contentType - The type of the lessons we need to get from the artist. If not defined, groq will get lessons from all content types
 * @param {Object} params - Parameters for sorting, searching, pagination and filtering.
 * @param {string} [params.sort="-published_on"] - The field to sort the lessons by.
 * @param {string} [params.searchTerm=""] - The search term to filter the lessons.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @param {Array<string>} [params.includedFields=[]] - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock'].
 * @param {Array<number>} [params.progressId=[]] - The ids of the lessons that are in progress or completed
 * @returns {Promise<ArtistLessons>} - The lessons for the artist
 *
 * @example
 * fetchArtistLessons('10 Years', 'drumeo', 'song', {'-published_on', '', 1, 10, ["difficulty,Intermediate"], [232168, 232824, 303375, 232194, 393125]})
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchArtistLessons(
  slug: string,
  brand: Brand | string,
  contentType: DocumentType,
  {
    sort = '-published_on',
    searchTerm = '',
    offset = 1,
    limit = 10,
    includedFields = [],
    progressIds = [],
  }: ArtistLessonOptions = {}
): Promise<ArtistLessons> {
  const fieldsString = getFieldsForContentType(contentType) as string
  const searchFilter = searchTerm ? `&& title match "${searchTerm}*"` : ''
  const includedFieldsFilter = includedFields.length > 0 ? filtersToGroq(includedFields) : ''
  const addType = contentType ? `_type == '${contentType}' && ` : ''
  const progressFilter =
    progressIds.length > 0 ? `&& railcontent_id in [${progressIds.join(',')}]` : ''
  const filter = `${addType} brand == '${brand}' ${searchFilter} ${includedFieldsFilter} && references(*[_type=='${DocumentType.Artist}' && slug.current == '${slug}']._id) ${progressFilter}`
  const filterWithRestrictions = await new FilterBuilder(filter).buildFilter()

  sort = getSortOrder(sort, brand as Brand)

  const data = query()
    .and(filterWithRestrictions)
    .order(sort)
    .slice(offset, offset + limit)
    .select(...(fieldsString ? [fieldsString] : []))
    .build()

  const total = query().and(filterWithRestrictions).build()

  const q = `{
    "data": ${data},
    "total": count(${total})
  }`

  return contentClient.fetchList(q, {
    sort,
    offset,
    limit,
  })
}
