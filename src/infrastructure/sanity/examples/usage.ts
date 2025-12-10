import { Brand } from '../../../lib/brands'
import { DocumentType } from '../../../lib/documents'
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
    type: DocumentType.Song,
    id: songId,
  })
}

// Example: Fetch a single song by ID with custom fields
export async function fetchSongWithCustomFieldsExample(songId: number) {
  return await contentClient.fetchById({
    type: DocumentType.Song,
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
    type: DocumentType.Course,
    id: courseId,
    includeChildren: true,
  })
}

// Example: Fetch multiple content items by IDs
export async function fetchMultipleSongsExample(songIds: number[]) {
  return await contentClient.fetchByIds(songIds, DocumentType.Song, Brand.Drumeo)
}

// Example: Fetch content by brand and type
export async function fetchDrumeoSongsExample() {
  return await contentClient.fetchByTypeAndBrand(DocumentType.Song, Brand.Drumeo, {
    limit: 20,
    sortBy: 'published_on desc',
  })
}

// Example: Fetch multiple songs with pagination
export async function fetchSongsExample(brand: Brand, page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit

  const query = `*[_type == "${DocumentType.Song}" && brand == "${brand}"] | order(published_on desc)[${offset}...${offset + limit}]{
    "id": railcontent_id,
    title,
    "artist": artist->name,
    "thumbnail": thumbnail.asset->url,
    difficulty_string,
    published_on
  }`

  return await sanityClient.fetchList(query, {
    sort: 'published_on desc',
    offset,
    limit,
  })
}

// Example: Execute a complex query that returns custom structure
export async function fetchSongsWithCountExample(brand: Brand) {
  const query = `{
    "data": *[_type == "${DocumentType.Song}" && brand == "${brand}"] | order(published_on desc)[0...10]{
      "id": railcontent_id,
      title,
      "artist": artist->name
    },
    "total": count(*[_type == "${DocumentType.Song}" && brand == "${brand}"])
  }`

  return await sanityClient.executeQuery(query)
}

// Example: Using with parameters (though GROQ doesn't support parameters like SQL)
export async function fetchFirstSongWithParamsExample(songId: number) {
  // Note: Sanity GROQ doesn't support parameterized queries like SQL
  // Parameters would be used for client-side processing if needed
  const query = `*[_type == "${DocumentType.Song}" && railcontent_id == ${songId}]`

  return await sanityClient.fetchFirst(query, { songId })
}

// Example: Using with parameters (though GROQ doesn't support parameters like SQL)
export async function fetchSingleSongWithParamsExample(songId: number) {
  // Note: Sanity GROQ doesn't support parameterized queries like SQL
  // Parameters would be used for client-side processing if needed
  const query = `*[_type == "${DocumentType.Song}" && railcontent_id == ${songId}][0]`

  return await sanityClient.fetchSingle(query, { songId })
}

// Example: Compose page type decorator with fetchSingle
export async function fetchSongWithPageType(songId: number): Promise<Lesson | null> {
  // Note: Sanity GROQ doesn't support parameterized queries like SQL
  // Parameters would be used for client-side processing if needed
  const query = `*[_type == "${DocumentType.Song}" && railcontent_id == ${songId}][0]`
  const result = await sanityClient.fetchSingle<Lesson>(query, { songId })
  return result ? pageTypeDecorator(result) : null
}

// Example: Execute a complex query that returns custom structure
export async function fetchSongsWithPermissions(brand: Brand) {
  const query = `{
    "data": *[_type == "${DocumentType.Song}" && brand == "${brand}"] | order(published_on desc)[0...10]{
      "id": railcontent_id,
      title,
      "artist": artist->name
    },
    "total": count(*[_type == "${DocumentType.Song}" && brand == "${brand}"])
  }`

  const adapter = getPermissionsAdapter()
  const [res, perms] = await Promise.all([
    sanityClient.executeQuery(query),
    adapter.fetchUserPermissions(),
  ])
  return res ? needsAccessDecorator(perms, adapter)(res) : null
}
//
// Example: Execute a complex query that returns custom structure
export async function fetchSongsWithPermissionsAndPageType(brand: Brand) {
  const query = `{
    "data": *[_type == "${DocumentType.Song}" && brand == "${brand}"] | order(published_on desc)[0...10]{
      "id": railcontent_id,
      title,
      "artist": artist->name
    },
    "total": count(*[_type == "${DocumentType.Song}" && brand == "${brand}"])
  }`

  const adapter = getPermissionsAdapter()
  const [res, perms] = await Promise.all([
    sanityClient.executeQuery(query),
    adapter.fetchUserPermissions(),
  ])
  return res ? pageTypeDecorator(needsAccessDecorator(perms, adapter)(res)) : null
}
