export type {
  SmartEmbedUrl,
  SmartEmbedContent,
  SmartEmbedResult,
  SmartEmbedViewerState,
  SmartEmbedWithViewerState,
  ProcessSmartEmbedsOptions,
  ProcessSmartEmbedsResult,
} from './types'

export {
  isInternalUrl,
  sanitizeUrl,
  parseContentUrl,
  extractUrlsFromText,
  parseMultipleUrls,
} from './urlParser'

export {
  resolveSmartEmbed,
  resolveSmartEmbeds,
  resolveSmartEmbedsFromUrls,
} from './contentResolver'

export {
  getViewerState,
  getViewerStates,
  enrichWithViewerState,
} from './viewerState'

export { INTERNAL_DOMAINS, VALID_BRANDS, isValidBrand } from './domains'

import { ProcessSmartEmbedsOptions, ProcessSmartEmbedsResult, SmartEmbedResult, SmartEmbedWithViewerState } from './types'
import { extractUrlsFromText, parseMultipleUrls, sanitizeUrl } from './urlParser'
import { resolveSmartEmbeds } from './contentResolver'
import { enrichWithViewerState } from './viewerState'

/**
 * @param urls - Array of URLs to process
 * @param options - Processing options
 * @returns Resolved embeds and unsupported URLs
 */
export async function processSmartEmbedUrls(
  urls: string[],
  options: ProcessSmartEmbedsOptions = {}
): Promise<ProcessSmartEmbedsResult> {
  const { includeViewerState = false, maxEmbeds } = options

  const uniqueUrls = [...new Map(urls.map((url) => [sanitizeUrl(url), url])).values()]
  const { parsed, unsupported } = parseMultipleUrls(uniqueUrls)

  const hasLimit = typeof maxEmbeds === 'number' && maxEmbeds > 0
  const embeddableUrls = hasLimit ? parsed.slice(0, maxEmbeds) : parsed
  const overLimitUrls = hasLimit ? parsed.slice(maxEmbeds).map((p) => p.originalUrl) : []

  let embeds: SmartEmbedResult[] | SmartEmbedWithViewerState[] = await resolveSmartEmbeds(embeddableUrls)

  const resolvedIds = new Set(embeds.map((e) => e.content.id))
  const notResolved = embeddableUrls
    .filter((p) => !resolvedIds.has(p.contentId))
    .map((p) => p.originalUrl)

  if (includeViewerState && embeds.length > 0) {
    embeds = await enrichWithViewerState(embeds)
  }

  return {
    embeds,
    unsupported: [...unsupported, ...notResolved, ...overLimitUrls],
  }
}

/**
 * @param text - Text containing URLs to extract and process
 * @param options - Processing options
 * @returns Resolved embeds and unsupported URLs
 */
export async function processSmartEmbedsFromText(
  text: string,
  options: ProcessSmartEmbedsOptions = {}
): Promise<ProcessSmartEmbedsResult> {
  const urls = extractUrlsFromText(text)
  return processSmartEmbedUrls(urls, options)
}

/**
 * Extracts and dedupes candidate embed URLs from a single entity's text (a comment,
 * a forum post, etc.), splitting them into what's eligible to resolve now vs. what's
 * over the per-entry cap. Cheap, synchronous, no network — call this per entity when
 * listing them, then batch the resulting embedUrls across all entities into a single
 * resolveEmbeds() call.
 *
 * @param text - Raw text/HTML to scan for URLs
 * @param maxEmbeds - Per-entry cap (default 5)
 * @returns Eligible URLs (within cap) and over-limit URLs (always left as plain links)
 */
export function getEligibleEmbedUrls(
  text: string,
  maxEmbeds: number = 5
): { embedUrls: string[]; overLimitUrls: string[] } {
  const seenUrls = new Set<string>()
  const uniqueUrls = extractUrlsFromText(text).filter((rawUrl) => {
    const sanitized = sanitizeUrl(rawUrl)
    if (seenUrls.has(sanitized)) return false
    seenUrls.add(sanitized)
    return true
  })

  return {
    embedUrls: uniqueUrls.slice(0, maxEmbeds),
    overLimitUrls: uniqueUrls.slice(maxEmbeds),
  }
}

/**
 * Batch-resolves smart embeds for a list of already-fetched entities (comments, forum
 * posts, etc.) that each carry embedUrls/overLimitUrls from getEligibleEmbedUrls().
 * Call this separately (non-blocking) after rendering the entities themselves, so
 * embed cards can show a loading/skeleton state until this resolves.
 *
 * @param entities - Objects with embedUrls/overLimitUrls, as returned by getEligibleEmbedUrls()
 * @returns The same entities enriched with embeds/unsupported
 */
export async function resolveEmbeds<T extends { embedUrls?: string[]; overLimitUrls?: string[] }>(
  entities: T[]
): Promise<Array<T & { embeds: SmartEmbedWithViewerState[]; unsupported: string[] }>> {
  const allEligibleUrls = entities.flatMap((entity) => entity.embedUrls || [])
  const { embeds, unsupported } = await processSmartEmbedUrls(allEligibleUrls, { includeViewerState: true })

  const results =  entities.map((entity) => {
    const sanitizedEligibleUrls = new Set((entity.embedUrls || []).map(sanitizeUrl))
    return {
      ...entity,
      embeds: (embeds as SmartEmbedWithViewerState[]).filter((embed) =>
        sanitizedEligibleUrls.has(embed.originalUrl)
      ),
      unsupported: [
        ...unsupported.filter((unsupportedUrl) => sanitizedEligibleUrls.has(sanitizeUrl(unsupportedUrl))),
        ...(entity.overLimitUrls || []),
      ],
    }
  })
  console.log('rox::: resolveEmbeds ............ ', results)
  return results
}
