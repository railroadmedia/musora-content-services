import { Brands } from '../../../lib/brands'
import { DocumentTypes } from '../../../lib/documents'
import { needsAccessDecorator, pageTypeDecorator } from '../../../lib/sanity/decorators'
import { Lesson } from '../../../services/content/content'
import { getPermissionsAdapter } from '../../../services/permissions'
import { SanityClient, ContentClient } from '../index'

/**
 * Example usage of the SanityClient and ContentClient
 *
 * This demonstrates how to use both the base SanityClient for raw queries
 * and the ContentClient for content-specific operations.
 * Both clients automatically use the global configuration from the config service.
 */

// Create client instances
const sanityClient = new SanityClient()
const contentClient = new ContentClient()

// Example: Fetch a single song by ID using the ContentClient
export async function fetchSongExample(songId: number) {
  return await contentClient.fetchById({
    type: DocumentTypes.Song,
    id: songId,
  })
}

// Example: Fetch a single song by ID with custom fields
export async function fetchSongWithCustomFieldsExample(songId: number) {
  return await contentClient.fetchById({
    type: DocumentTypes.Song,
    id: songId,
    fields: [
      "'id': railcontent_id",
      'title',
      "'artist': artist->name",
      "'thumbnail': thumbnail.asset->url",
      'difficulty_string',
      'published_on',
      'album',
      'soundslice',
    ],
  })
}

// Example: Fetch a course with its children/lessons
export async function fetchCourseWithLessonsExample(courseId: number) {
  return await contentClient.fetchById({
    type: DocumentTypes.Course,
    id: courseId,
    includeChildren: true,
  })
}

// Example: Fetch multiple content items by IDs
export async function fetchMultipleSongsExample(songIds: number[]) {
  return await contentClient.fetchByIds(songIds, DocumentTypes.Song, Brands.drumeo)
}

// Example: Fetch content by brand and type
export async function fetchDrumeoSongsExample() {
  return await contentClient.fetchByTypeAndBrand(DocumentTypes.Song, Brands.drumeo, {
    limit: 20,
    sortBy: 'published_on desc',
  })
}

// Example: Fetch multiple songs with pagination
export async function fetchSongsExample(brand: Brands, page: number = 1, limit: number = 10) {
  const start = (page - 1) * limit
  const end = start + limit

  const query = `*[_type == "${DocumentTypes.Song}" && brand == "${brand}"] | order(published_on desc)[${start}...${end}]`
  const fields = `
    "id": railcontent_id,
    title,
    "artist": artist->name,
    "thumbnail": thumbnail.asset->url,
    difficulty_string,
    published_on
  `

  return await sanityClient.fetchList(query, fields, { sort: 'published_on desc', start, end })
}

// Example: Execute a complex query that returns custom structure
export async function fetchSongsWithCountExample(brand: Brands) {
  const query = `{
    "data": *[_type == "${DocumentTypes.Song}" && brand == "${brand}"] | order(published_on desc)[0...10]{
      "id": railcontent_id,
      title,
      "artist": artist->name
    },
    "total": count(*[_type == "${DocumentTypes.Song}" && brand == "${brand}"])
  }`

  return await sanityClient.executeQuery(query)
}

// Example: Using with parameters (though GROQ doesn't support parameters like SQL)
export async function fetchFirstSongWithParamsExample(songId: number) {
  // Note: Sanity GROQ doesn't support parameterized queries like SQL
  // Parameters would be used for client-side processing if needed
  const query = `*[_type == "${DocumentTypes.Song}" && railcontent_id == ${songId}]`

  return await sanityClient.fetchFirst(query, { songId })
}

// Example: Using with parameters (though GROQ doesn't support parameters like SQL)
export async function fetchSingleSongWithParamsExample(songId: number) {
  // Note: Sanity GROQ doesn't support parameterized queries like SQL
  // Parameters would be used for client-side processing if needed
  const query = `*[_type == "${DocumentTypes.Song}" && railcontent_id == ${songId}][0]`

  return await sanityClient.fetchSingle(query, { songId })
}

// Example: Compose page type decorator with fetchSingle
export async function fetchSongWithPageType(songId: number): Promise<Lesson | null> {
  // Note: Sanity GROQ doesn't support parameterized queries like SQL
  // Parameters would be used for client-side processing if needed
  const query = `*[_type == "${DocumentTypes.Song}" && railcontent_id == ${songId}][0]`
  return sanityClient.fetchSingle<Lesson>(query, { songId }).then((res) => pageTypeDecorator(res))
}

// Example: Execute a complex query that returns custom structure
export async function fetchSongsWithPermissions(brand: Brands) {
  const query = `{
    "data": *[_type == "${DocumentTypes.Song}" && brand == "${brand}"] | order(published_on desc)[0...10]{
      "id": railcontent_id,
      title,
      "artist": artist->name
    },
    "total": count(*[_type == "${DocumentTypes.Song}" && brand == "${brand}"])
  }`

  const adapter = getPermissionsAdapter()
  return Promise.all([sanityClient.executeQuery(query), adapter.fetchUserPermissions()]).then(
    ([res, perms]) => needsAccessDecorator(res, perms, adapter)
  )
}
//
// Example: Execute a complex query that returns custom structure
export async function fetchSongsWithPermissionsAndPageType(brand: Brands) {
  const query = `{
    "data": *[_type == "${DocumentTypes.Song}" && brand == "${brand}"] | order(published_on desc)[0...10]{
      "id": railcontent_id,
      title,
      "artist": artist->name
    },
    "total": count(*[_type == "${DocumentTypes.Song}" && brand == "${brand}"])
  }`

  const adapter = getPermissionsAdapter()
  return Promise.all([sanityClient.executeQuery(query), adapter.fetchUserPermissions()])
    .then(([res, perms]) => needsAccessDecorator(res, perms, adapter))
    .then(pageTypeDecorator)
}
