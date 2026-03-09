import { globalConfig } from './config.js'

// no user_id, can be used across accounts
const cacheKey = 'content_metadata_cache'

interface MetadataParameter {
  [contentId: string]: MetadataFields
}
interface MetadataFields {
  b: string // brand
  t: number // content type
  p: number // parent id
}

export async function setCachedContentMetadata(metadata: MetadataParameter) {
  const cachedMetadata = await fetchCachedMetadata() ?? {}

  for (const contentId in metadata) {
    cachedMetadata[contentId] = metadata[contentId]
  }

  await globalConfig.localStorage.setItem(cacheKey, JSON.stringify(cachedMetadata))
}

export async function getCachedContentMetadata(ids: number[]): Promise<Record<string, MetadataFields>> {
  if (ids.length === 0) return {}

  const cachedMetadata = await fetchCachedMetadata()
  if (!cachedMetadata) return {}

  return ids.reduce((acc, id) => {
    if (cachedMetadata[id]) {
      acc[id] = cachedMetadata[id]
    }
    return acc
  }, {} as Record<string, MetadataFields>)
}

async function fetchCachedMetadata(): Promise<Record<string, MetadataFields> | null> {
  try {
    const cache = await globalConfig.localStorage.getItem(cacheKey)

    if (!cache) {
      return null
    }

    return JSON.parse(cache) as Record<string, MetadataFields>
  } catch (error) {
    console.error('Failed to parse cached content metadata:', error)
    return null
  }
}
