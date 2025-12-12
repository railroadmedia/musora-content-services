/**
 * @module Artist
 */
import { getFieldsForContentType } from '../../contentTypeConfig.js'
import { ContentClient } from '../../infrastructure/sanity/clients/ContentClient'
import { SanityListResponse } from '../../infrastructure/sanity/interfaces/SanityResponse'
import { Brand } from '../../lib/brands'
import { DocumentType } from '../../lib/documents'
import { BuildQueryOptions, getSortOrder, query } from '../../lib/sanity/query'
import { Lesson } from './content'
import { Filters as f } from '../../lib/sanity/filter'

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
  const lessonFilter = f.combine(f.brand(brand), f.referencesParent())
  const type = f.type(DocumentType.Artist)
  const lessonCount = `count(*[${lessonFilter}])`
  const postFilter = `lessonCount > 0`

  const data = query()
    .and(type)
    .order(getSortOrder(options?.sort || 'lower(name) asc', brand as Brand))
    .slice(options?.offset || 0, options?.limit || 20)
    .select(
      'name',
      `"slug": slug.current`,
      `"thumbnail": thumbnail_url.asset->url`,
      `"lessonCount": ${lessonCount}`
    )
    .postFilter(postFilter)
    .build()

  const total = query()
    .and(type)
    .select(`"lessonCount": ${lessonCount}`)
    .postFilter(postFilter)
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
  const filter = f.combine(brand ? f.brand(brand) : f.empty, f.referencesParent())

  const q = query()
    .and(f.type('artist'))
    .and(f.slug(slug))
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
    offset = 0,
    limit = 10,
    includedFields = [],
    progressIds = [],
  }: ArtistLessonOptions = {}
): Promise<ArtistLessons> {
  sort = getSortOrder(sort, brand as Brand)

  const restrictions = await f.combineAsync(
    f.contentFilter(),
    f.referencesIDWithFilter(f.combine(f.type('artist'), f.slug(slug)))
  )

  const data = query()
    .and(f.brand(brand))
    .and(f.searchMatch('title', searchTerm))
    .and(f.includedFields(includedFields))
    .and(f.progressIds(progressIds))
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

  return contentClient.fetchList(q, {
    sort,
    offset,
    limit,
  })
}
