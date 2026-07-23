import { fetchByRailContentIds } from '../sanity.js'
import { SmartEmbedUrl, SmartEmbedContent, SmartEmbedResult } from './types'

interface SanityContent {
  id: number
  sanity_id?: string
  title: string
  type: string
  thumbnail?: string | null
  image?: string | null
  artist_name?: string | null
  artist?: { name?: string } | null
  instructor?: Array<{ name?: string }> | null
  difficulty?: number | null
  difficulty_string?: string | null
  length_in_seconds?: number | null
  brand: string
  slug?: string | null
  permission_id?: number | null
  membership_tier?: string | null
  published_on?: string | null
  status: string
  live_event_start_time?: string | null
  live_event_end_time?: string | null
  parent_id?: number | null
}

function mapToSmartEmbedContent(content: SanityContent): SmartEmbedContent {
  const instructorName = content.instructor?.[0]?.name || null
  const artistName = content.artist?.name || content.artist_name || null

  return {
    id: content.id,
    sanityId: content.sanity_id || '',
    title: content.title,
    type: content.type,
    thumbnail: content.thumbnail || content.image || null,
    instructorName,
    artistName,
    difficulty: content.difficulty_string || null,
    lengthInSeconds: content.length_in_seconds || null,
    brand: content.brand,
    slug: content.slug || '',
    permissionId: content.permission_id || null,
    membershipTier: content.membership_tier || null,
    publishedOn: content.published_on || null,
    status: content.status,
    liveEventStartTime: content.live_event_start_time || null,
    liveEventEndTime: content.live_event_end_time || null,
  }
}

export async function resolveSmartEmbed(
  parsedUrl: SmartEmbedUrl
): Promise<SmartEmbedResult | null> {
  const results = await resolveSmartEmbeds([parsedUrl])
  return results[0] || null
}

export async function resolveSmartEmbeds(
  parsedUrls: SmartEmbedUrl[]
): Promise<SmartEmbedResult[]> {
  if (parsedUrls.length === 0) {
    return []
  }

  const contentIds = parsedUrls.map((p) => p.contentId)
  const uniqueIds = [...new Set(contentIds)]

  let contents: SanityContent[]
  try {
    contents = await fetchByRailContentIds(uniqueIds)
  } catch {
    return []
  }

  if (!contents || contents.length === 0) {
    return []
  }

  const contentMap = new Map<number, SanityContent>()
  for (const content of contents) {
    if (content && content.id) {
      contentMap.set(content.id, content)
    }
  }

  const results: SmartEmbedResult[] = []

  for (const parsedUrl of parsedUrls) {
    const content = contentMap.get(parsedUrl.contentId)

    if (!content) {
      continue
    }

    if (content.status !== 'published' && content.status !== 'scheduled' && content.status !== 'unlisted') {
      continue
    }

    const smartEmbedContent = mapToSmartEmbedContent(content)

    results.push({
      content: smartEmbedContent,
      originalUrl: parsedUrl.originalUrl,
    })
  }

  return results
}

export async function resolveSmartEmbedsFromUrls(
  urls: string[]
): Promise<{ results: SmartEmbedResult[]; unsupported: string[] }> {
  const { parseMultipleUrls } = await import('./urlParser')

  const { parsed, unsupported } = parseMultipleUrls(urls)
  const results = await resolveSmartEmbeds(parsed)

  const resolvedIds = new Set(results.map((r) => r.content.id))
  const notResolved = parsed
    .filter((p) => !resolvedIds.has(p.contentId))
    .map((p) => p.originalUrl)

  return {
    results,
    unsupported: [...unsupported, ...notResolved],
  }
}
