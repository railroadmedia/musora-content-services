import { SmartEmbedUrl } from './types'
import { TRACKING_PARAMS_TO_REMOVE, isInternalHostname, isValidBrand } from './domains'

const CONTENT_PAGE_TYPES = ['songs', 'lessons', 'method', 'quick-tips', 'packs']

export function isInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return isInternalHostname(parsed.hostname)
  } catch {
    return false
  }
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)

    for (const param of TRACKING_PARAMS_TO_REMOVE) {
      parsed.searchParams.delete(param)
    }

    parsed.hash = ''

    return parsed.toString()
  } catch {
    return url
  }
}

export function parseContentUrl(url: string): SmartEmbedUrl | null {
  if (!isInternalUrl(url)) {
    return null
  }

  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(Boolean)

    if (segments.length < 3) {
      return null
    }

    const brand = segments[0].toLowerCase()
    if (!isValidBrand(brand)) {
      return null
    }

    const pageType = segments[1]
    // if (!CONTENT_PAGE_TYPES.includes(pageType)) {
    //   return null
    // }

    const lastSegment = segments[segments.length - 1]
    const isLiveLesson = pageType === 'lessons' && lastSegment === 'live'
    const idSegment = isLiveLesson ? segments[segments.length - 2] : lastSegment

    const contentId = parseInt(idSegment, 10)
    if (isNaN(contentId)) {
      return null
    }

    return {
      brand,
      contentId,
      originalUrl: sanitizeUrl(url),
    }
  } catch {
    return null
  }
}

export function extractUrlsFromText(text: string): string[] {
  // Links the user explicitly kept as plain links in the smart-embed editor are
  // marked data-embed="false" and must never be re-offered as embed candidates
  const withoutExcludedLinks = text.replace(
    /<a\b[^>]*\bdata-embed=["']false["'][^>]*>[\s\S]*?<\/a>/gi,
    ''
  )

  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
  const matches = withoutExcludedLinks.match(urlPattern) || []

  return matches.map(url => url.replace(/[.,;:!?)]+$/, ''))
}

export function parseMultipleUrls(urls: string[]): {
  parsed: SmartEmbedUrl[]
  unsupported: string[]
} {
  const parsed: SmartEmbedUrl[] = []
  const unsupported: string[] = []

  for (const url of urls) {
    const result = parseContentUrl(url)
    if (result) {
      parsed.push(result)
    } else if (isInternalUrl(url)) {
      unsupported.push(url)
    }
  }

  return { parsed, unsupported }
}
