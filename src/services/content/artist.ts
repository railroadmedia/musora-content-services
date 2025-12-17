/**
 * @module Artist
 */
import { getFieldsForContentType } from '../../contentTypeConfig.js'
import { SanityListResponse } from '../../infrastructure/sanity/interfaces/SanityResponse'
import { SanityClient } from '../../infrastructure/sanity/SanityClient'
import { Brand } from '../../lib/brands'
import { DocumentType } from '../../lib/documents'
import { Filters as f } from '../../lib/sanity/filter'
import { BuildQueryOptions, getSortOrder, query } from '../../lib/sanity/query'
import { getPermissionsAdapter } from '../permissions'
import { Lesson } from './content'
import { NeedAccessDecorated, needsAccessDecorator } from '../../lib/sanity/decorators'

const contentClient = new SanityClient()

export interface Artist {
  slug: string
  name: string
  thumbnail: string
  lesson_count: number
}

export type Artists = SanityListResponse<Artist>

/**
 * Fetch all artists with lessons available for a specific brand.
 *
 * @param {Brand} brand - The brand for which to fetch artists.
 * @returns {Promise<Artists>} - A promise that resolves to an array of artist objects or null if not found.
 *
 * @example
 * fetchArtists('drumeo')
 *   .then(artists => console.log(artists))
 *   .catch(error => console.error(error));
 */
export async function fetchArtists(
  brand: Brand,
  options: BuildQueryOptions = {
    sort: 'lower(name) asc',
    offset: 0,
    limit: 20,
  }
): Promise<Artists> {
  const type = f.type('artist')
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

  return contentClient.fetchList<Artist>(q, options)
}

/**
 * Fetch a single artist by their Sanity ID.
 *
 * @param {string} slug - The name of the artist to fetch.
 * @param {Brand} [brand] - The brand for which to fetch the artist.
 * @returns {Promise<Artist|null>} - A promise that resolves to an artist objects or null if not found.
 *
 * @example
 * fetchArtists('drumeo')
 *   .then(artists => console.log(artists))
 *   .catch(error => console.error(error));
 */
export async function fetchArtistBySlug(slug: string, brand?: Brand): Promise<Artist | null> {
  const q = query()
    .and(f.type('artist'))
    .and(f.slug(slug))
    .select(
      'name',
      `"slug": slug.current`,
      `"thumbnail": thumbnail_url.asset->url`,
      `"lesson_count": ${await f.lessonCount(brand)}`
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

export type ArtistLessons = SanityListResponse<Lesson & NeedAccessDecorated>

/**
 * Fetch the artist's lessons.
 * @param {string} slug - The slug of the artist
 * @param {Brand} brand - The brand for which to fetch lessons.
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
  brand: Brand,
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
  sort = getSortOrder(sort, brand)

  const restrictions = await f.combineAsync(
    f.status(),
    f.publishedDate(),
    f.notDeprecated(),
    f.referencesIDWithFilter(f.combine(f.type('artist'), f.slug(slug))),
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

  return contentClient
    .fetchList<Lesson>(q, {
      sort,
      offset,
      limit,
    })
    .then(needsAccessDecorator()) as Promise<ArtistLessons>
}
