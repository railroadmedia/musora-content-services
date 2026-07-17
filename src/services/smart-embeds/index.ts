export {
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
import { extractUrlsFromText, parseMultipleUrls } from './urlParser'
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

  const { parsed, unsupported } = parseMultipleUrls(urls)

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
