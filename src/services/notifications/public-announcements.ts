import { fetchSanity, getSanityDate } from '../sanity.js'
import { toHTML } from '@portabletext/to-html'
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
  const rawNow = new Date().getTime()
  const nowDate = getSanityDate(rawNow)
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

/**
 * @param {Array<Object>} blocks - Sanity Portable Text / block content array
 * @returns {string} HTML string
 */
export function blockContentToHtml(blocks: any[]): string {
  if (!blocks) {
    return ''
  }
  return toHTML(blocks, {
    components: {
      types: {
        image: ({ value }) => {
          const url = sanityImageRefToUrl(value?.asset?._ref)
          return url ? `<img src="${url}" />` : ''
        },
      },
    },
  })
}

function sanityImageRefToUrl(ref: string | undefined): string | null {
  const match = ref?.match(/^image-([a-f0-9]+)-(\d+x\d+)-(\w+)$/)
  if (!match) {
    return null
  }
  const [, assetId, dimensions, format] = match
  const { projectId, dataset } = globalConfig.sanityConfig
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${assetId}-${dimensions}.${format}`
}
