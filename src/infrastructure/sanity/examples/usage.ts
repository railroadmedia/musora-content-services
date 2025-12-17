import { Brand } from '../../../lib/brands'
import { needsAccessDecorator, pageTypeDecorator } from '../../../lib/sanity/decorators'
import { Filters as f } from '../../../lib/sanity/filter'
import { query } from '../../../lib/sanity/query'
import { Lesson } from '../../../services/content/content'
import { getPermissionsAdapter } from '../../../services/permissions'
import { SanityClient } from '../index'

/**
 * Example usage of the SanityClient
 *
 * This demonstrates how to use both the base SanityClient for raw queries
 * Both clients automatically use the global configuration from the config service.
 */

// Create client instances
const sanityClient = new SanityClient()

// Example: Fetch a single song by ID using the SanityClient
export async function fetchSongExample(songId: number) {
  return await sanityClient.fetchSingle(
    query().and(`_type == "song"`).and(`railcontent_id == ${songId}`).build()
  )
}

// Example: Fetch a single song by ID with custom fields
export async function fetchSongWithCustomFieldsExample(songId: number) {
  return await sanityClient.fetchSingle(
    query()
      .and(`_type == "song"`)
      .and(`railcontent_id == ${songId}`)
      .select(
        "'id': railcontent_id",
        'title',
        "'artist': artist->name",
        "'thumbnail': thumbnail.asset->url",
        'difficulty_string',
        'published_on',
        'album',
        'soundslice'
      )
      .build()
  )
}

// Example: Fetch multiple content items by IDs
export async function fetchMultipleSongsExample(songIds: number[]) {
  const sort = 'published_on desc'
  const offset = 0
  const limit = songIds.length
  return await sanityClient.fetchList(
    query().and(f.type('song')).and(f.idIn(songIds)).and(f.brand('drumeo')).order(sort).build(),
    {
      sort,
      offset,
      limit,
    }
  )
}

// Example: Fetch content by brand and type
export async function fetchDrumeoSongsExample() {
  const sort = 'published_on desc'
  const offset = 0
  const limit = 20

  return await sanityClient.fetchList(
    query()
      .and(f.type('song'))
      .and(f.brand('drumeo'))
      .order('published_on desc')
      .slice(0, 20)
      .build(),
    { sort, offset, limit }
  )
}

// Example: Fetch multiple songs with pagination
export async function fetchSongsExample(brand: Brand, page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit

  const fields = `
    "id": railcontent_id,
    title,
    "artist": artist->name,
    "thumbnail": thumbnail.asset->url,
    difficulty_string,
    published_on
  }`

  const q = query()
    .and(`_type == "song"`)
    .and(`brand == "${brand}"`)
    .select(fields)
    .order('published_on desc')
    .slice(offset, limit)
    .build()

  return await sanityClient.fetchList(q, {
    sort: 'published_on desc',
    offset,
    limit,
  })
}

// Example: Execute a complex query that returns custom structure
export async function fetchSongsWithCountExample(brand: Brand) {
  const query = `{
    "data": *[_type == "song" && brand == "${brand}"] | order(published_on desc)[0...10]{
      "id": railcontent_id,
      title,
      "artist": artist->name
    },
    "total": count(*[_type == "song" && brand == "${brand}"])
  }`

  return await sanityClient.executeQuery(query)
}

// Example: Using with parameters (though GROQ doesn't support parameters like SQL)
export async function fetchFirstSongWithParamsExample(songId: number) {
  // Note: Sanity GROQ doesn't support parameterized queries like SQL
  // Parameters would be used for client-side processing if needed
  const query = `*[_type == "song" && railcontent_id == ${songId}]`

  return await sanityClient.fetchFirst(query, { songId })
}

// Example: Using with parameters (though GROQ doesn't support parameters like SQL)
export async function fetchSingleSongWithParamsExample(songId: number) {
  // Note: Sanity GROQ doesn't support parameterized queries like SQL
  // Parameters would be used for client-side processing if needed
  const query = `*[_type == "song" && railcontent_id == ${songId}][0]`

  return await sanityClient.fetchSingle(query, { songId })
}

// Example: Compose page type decorator with fetchSingle
export async function fetchSongWithPageType(songId: number): Promise<Lesson | null> {
  // Note: Sanity GROQ doesn't support parameterized queries like SQL
  // Parameters would be used for client-side processing if needed
  const query = `*[_type == "song" && railcontent_id == ${songId}][0]`
  return sanityClient.fetchSingle<Lesson>(query, { songId }).then((res) => pageTypeDecorator(res))
}

// Example: Execute a complex query that returns custom structure
export async function fetchSongsWithPermissions(brand: Brand) {
  const query = `{
    "data": *[_type == "song" && brand == "${brand}"] | order(published_on desc)[0...10]{
      "id": railcontent_id,
      title,
      "artist": artist->name
    },
    "total": count(*[_type == "song" && brand == "${brand}"])
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
    "data": *[_type == "song" && brand == "${brand}"] | order(published_on desc)[0...10]{
      "id": railcontent_id,
      title,
      "artist": artist->name
    },
    "total": count(*[_type == "song" && brand == "${brand}"])
  }`

  const adapter = getPermissionsAdapter()
  const [res, perms] = await Promise.all([
    sanityClient.executeQuery(query),
    adapter.fetchUserPermissions(),
  ])
  return res ? pageTypeDecorator(needsAccessDecorator(perms, adapter)(res)) : null
}
