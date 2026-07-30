import { fetchSanity, getSanityDate } from '../sanity.js'
import { globalConfig } from '../config.js'

interface PublicAnnouncement {
  title: string
  slug: string
  published_on: string
  description: string
  message: string
  forum_data?: Record<string, ForumData>
}

interface ForumData {
  category_id: string
  forum_id: string
  url: string
}

/**
 * Fetches a specific public announcement by slug, or by default the most recent published one.
 * @param {string|null} slug
 * @returns {Promise<PublicAnnouncement|null>} The public announcement object, or null if not found
 */
export async function fetchPublicAnnouncement(slug?: string): Promise<PublicAnnouncement | null> {
  const now = getSanityDate(new Date())

  const slugString = slug ? `&& slug.current == '${slug}'` : ''

  // grab the specific one by slug, or the most recent one if no slug is provided
  const query = `*[_type == 'public-announcement' && published_on <= '${now}' ${slugString}]
    {
      title,
      'slug': slug.current,
      published_on,
      description,
      message,
      forum_data
    }
    | order(published_on desc)`

  const result = await fetchSanity(query, false, {processNeedAccess: false, processPageType: false})

  if (result?.message) {
    result.message = blockContentToHtml(result.message)
  }

  return result
}

/**
 * Fetches all public announcements published within the last `spanDays` days (default 1 year).
 * @param {number|null} spanDays - Number of days to look back for public announcements (default: 1 year)
 * @returns {Promise<PublicAnnouncement[]|null>} Array of public announcement objects, or null if none found
 */
export async function fetchAllPublicAnnouncements(spanDays: number = 365): Promise<PublicAnnouncement[] | null> {
  const rawNowDate = new Date()
  const rawNow = new Date().getTime()
  const nowDate = getSanityDate(rawNowDate)
  const startDate = getSanityDate(new Date(rawNow - spanDays * 24 * 60 * 60 * 1000))

  const query = `*[_type == 'public-announcement' && published_on >= '${startDate}' && published_on <= '${nowDate}']
    {
      title,
      'slug': slug.current,
      published_on
    }
    | order(published_on desc)`

  return await fetchSanity(query, true, {processNeedAccess: false, processPageType: false})
}

interface ListStackEntry {
  tag: 'ul' | 'ol'
  level: number
}

/**
 * @param {Array<Object>} blocks - Sanity Portable Text / block content array
 * @returns {string} HTML string
 */
export function blockContentToHtml(blocks: any[]): string {
  if (!blocks) {
    return ''
  }

  let html = ''
  const listStack: ListStackEntry[] = []

  for (const block of blocks) {
    const listItem = block.listItem ?? null

    if (!listItem) {
      html += closeLists(listStack, 0)
      html += block._type === 'image' ? renderImage(block) : renderBlock(block)
      continue
    }

    const level = block.level ?? 1
    const tag: 'ul' | 'ol' = listItem === 'number' ? 'ol' : 'ul'

    while (
      listStack.length &&
      (listStack[listStack.length - 1].level > level ||
        (listStack[listStack.length - 1].level === level && listStack[listStack.length - 1].tag !== tag))
    ) {
      const closed = listStack.pop()
      html += `</${closed.tag}>`
    }

    while (!listStack.length || listStack[listStack.length - 1].level < level) {
      listStack.push({ tag, level: listStack.length + 1 })
      html += `<${tag}>`
    }

    html += `<li>${renderInline(block)}</li>`
  }

  html += closeLists(listStack, 0)
  return html
}

function closeLists(listStack: ListStackEntry[], downToLevel: number): string {
  let html = ''
  while (listStack.length && listStack[listStack.length - 1].level > downToLevel) {
    const closed = listStack.pop()
    html += `</${closed.tag}>`
  }
  return html
}

function renderInline(block: any): string {
  const markDefsByKey: Record<string, any> = {}
  for (const markDef of block.markDefs ?? []) {
    markDefsByKey[markDef._key] = markDef
  }

  let inner = ''
  for (const child of block.children ?? []) {
    inner += renderSpan(child, markDefsByKey)
  }

  return inner === '' ? '&nbsp;' : inner
}

function renderBlock(block: any): string {
  const tag = ((): string => {
    switch (block.style ?? 'normal') {
      case 'h1':
        return 'h1'
      case 'h2':
        return 'h2'
      case 'h3':
        return 'h3'
      case 'h4':
        return 'h4'
      case 'blockquote':
        return 'blockquote'
      default:
        return 'p'
    }
  })()

  const inner = renderInline(block)

  return `<${tag}>${inner}</${tag}>`
}

function renderSpan(child: any, markDefsByKey: Record<string, any>): string {
  let text = escapeHtml(child.text ?? '')
  text = text.replace(/\n/g, '<br />')

  for (const mark of child.marks ?? []) {
    switch (true) {
      case mark === 'strong':
        text = `<strong>${text}</strong>`
        break
      case mark === 'em':
        text = `<em>${text}</em>`
        break
      case mark === 'underline':
        text = `<u>${text}</u>`
        break
      case mark === 'code':
        text = `<code>${text}</code>`
        break
      case markDefsByKey[mark] !== undefined:
        text = renderMarkDef(markDefsByKey[mark], text)
        break
    }
  }

  return text
}

function renderMarkDef(markDef: any, text: string): string {
  if (markDef?._type !== 'link') {
    return text
  }
  const href = escapeHtml(markDef.href ?? '')
  return `<a href="${href}">${text}</a>`
}

function renderImage(block: any): string {
  const ref = block.asset?._ref ?? null
  const percent = block.display_width_percent ?? 100

  const url = sanityImageRefToUrl(ref, percent)
  if (!url) {
    return ''
  }

  return percent < 100
    ? `<img src="${url}" style="width:${percent}%;max-width:100%;" />`
    : `<img src="${url}" />`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * @param {string|null} ref
 * @param {number} widthPercent - Percentage of the asset's original width to request from the CDN.
 * @returns {string|null}
 */
function sanityImageRefToUrl(ref: string | null | undefined, widthPercent: number = 100): string | null {
  const match = ref?.match(/^image-([a-f0-9]+)-(\d+)x(\d+)-(\w+)$/)
  if (!match) {
    return null
  }
  const [, assetId, originalWidth, originalHeight, format] = match
  const { projectId, dataset } = globalConfig.sanityConfig
  let url = `https://cdn.sanity.io/images/${projectId}/${dataset}/${assetId}-${originalWidth}x${originalHeight}.${format}`

  if (widthPercent < 100) {
    const width = Math.round((Number(originalWidth) * widthPercent) / 100)
    url += `?w=${width}`
  }

  return url
}
