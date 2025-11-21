/**
 * @module Artist
 */
import { DEFAULT_FIELDS, filtersToGroq } from '../../contentTypeConfig.js'
import { FilterBuilder } from '../../filterBuilder.js'
import { fetchSanity, getSanityDate, getSortOrder } from '../sanity.js'
import { Lesson } from './content'

export interface Artist {
  slug: string
  name: string
  lessons?: Lesson[]
  lessonsCount: number
}

/**
 * Fetch all artists with lessons available for a specific brand.
 *
 * @param {string} brand - The brand for which to fetch artists.
 * @returns {Promise<Artist[]|null>} - A promise that resolves to an array of artist objects or null if not found.
 *
 * @example
 * fetchArtists('drumeo')
 *   .then(artists => console.log(artists))
 *   .catch(error => console.error(error));
 */
export async function fetchArtists(brand: string): Promise<Artist[] | null> {
  const filter = await new FilterBuilder(
    `_type == "song" && brand == "${brand}" && references(^._id)`,
    { bypassPermissions: true }
  ).buildFilter()
  const query = `
  *[_type == "artist"]{
    name,
    "slug": slug.current,
    "lessonsCount": count(*[${filter}])
  }[lessonsCount > 0] |order(lower(name)) `
  return fetchSanity(query, true, { processNeedAccess: false, processPageType: false })
}

/**
 * Fetch a single artist by their Sanity ID.
 *
 * @param {string} slug - The name of the artist to fetch.
 * @param {string} [brand] - The brand for which to fetch the artist.
 * @returns {Promise<Artist|null>} - A promise that resolves to an artist objects or null if not found.
 *
 * @example
 * fetchArtists('drumeo')
 *   .then(artists => console.log(artists))
 *   .catch(error => console.error(error));
 */
export async function fetchArtistBySlug(slug: string, brand?: string): Promise<Artist | null> {
  const brandFilter = brand ? `brand == "${brand}" && ` : ''
  const filter = await new FilterBuilder(`${brandFilter} _type == "song" && references(^._id)`, {
    bypassPermissions: true,
  }).buildFilter()
  const query = `
  *[_type == "artist" && slug.current == '${slug}']{
    name,
    "slug": slug.current,
    "lessonsCount": count(*[${filter}])
  }[lessonsCount > 0] |order(lower(name)) `
  return fetchSanity(query, true, { processNeedAccess: false, processPageType: false })
}

export interface ArtistLessonOptions {
  sort?: string
  searchTerm?: string
  page?: number
  limit?: number
  includedFields?: Array<string>
  progressIds?: Array<number>
}

export interface LessonsByArtistResponse {
  data: Artist[]
}

/**
 * Fetch the artist's lessons.
 * @param {string} slug - The slug of the artist
 * @param {string} brand - The brand for which to fetch lessons.
 * @param {string} contentType - The type of the lessons we need to get from the artist. If not defined, groq will get lessons from all content types
 * @param {Object} params - Parameters for sorting, searching, pagination and filtering.
 * @param {string} [params.sort="-published_on"] - The field to sort the lessons by.
 * @param {string} [params.searchTerm=""] - The search term to filter the lessons.
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.limit=10] - The number of items per page.
 * @param {Array<string>} [params.includedFields=[]] - Additional filters to apply to the query in the format of a key,value array. eg. ['difficulty,Intermediate', 'genre,rock'].
 * @param {Array<number>} [params.progressIds] - The ids of the lessons that are in progress or completed
 * @returns {Promise<LessonsByArtistResponse|null>} - The lessons for the artist and some details about the artist (name and thumbnail).
 *
 * @example
 * fetchArtistLessons('10 Years', 'drumeo', 'song', {'-published_on', '', 1, 10, ["difficulty,Intermediate"], [232168, 232824, 303375, 232194, 393125]})
 *   .then(lessons => console.log(lessons))
 *   .catch(error => console.error(error));
 */
export async function fetchArtistLessons(
  slug: string,
  brand: string,
  contentType: string,
  {
    sort = '-published_on',
    searchTerm = '',
    page = 1,
    limit = 10,
    includedFields = [],
    progressIds = undefined,
  }: ArtistLessonOptions = {}
): Promise<LessonsByArtistResponse | null> {
  const fieldsString = DEFAULT_FIELDS.join(',')
  const start = (page - 1) * limit
  const end = start + limit
  const searchFilter = searchTerm ? `&& title match "${searchTerm}*"` : ''
  const sortOrder = getSortOrder(sort, brand)
  const addType =
    contentType && Array.isArray(contentType)
      ? `_type in ['${contentType.join("', '")}'] &&`
      : contentType
        ? `_type == '${contentType}' && `
        : ''
  const includedFieldsFilter = includedFields.length > 0 ? filtersToGroq(includedFields) : ''

  // limits the results to supplied progressIds for started & completed filters
  const progressFilter =
    progressIds !== undefined ? `&& railcontent_id in [${progressIds.join(',')}]` : ''
  const now = getSanityDate(new Date())
  const query = `{
    "data":
      *[_type == 'artist' && slug.current == '${slug}']
        {'type': _type, name, 'thumbnail':thumbnail_url.asset->url,
        'lessons_count': count(*[${addType} brand == '${brand}' && references(^._id)]),
        'lessons': *[${addType} brand == '${brand}' && references(^._id) && (status in ['published'] || (status == 'scheduled' && defined(published_on) && published_on >= '${now}')) ${searchFilter} ${includedFieldsFilter} ${progressFilter}]{${fieldsString}}
      [${start}...${end}]}
      |order(${sortOrder})
  }`
  return fetchSanity(query, true, { processNeedAccess: false, processPageType: false })
}
