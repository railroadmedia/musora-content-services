import { SONG_TYPES } from '../../contentTypeConfig.js'
import { SanityClient } from '../../infrastructure/sanity/SanityClient'
import { Brands } from '../../lib/brands'
import { Filters as f } from '../../lib/sanity/filter'
import { query } from '../../lib/sanity/query'

const sanityClient = new SanityClient()

export interface SongAndLessonCounts {
  songs: number
  lessons: number
  total: number
}

/**
 * @param {Brands|string} [brand] - Filters by brand; omit for a global count.
 * @returns {Promise<SongAndLessonCounts>}
 */
export async function fetchSongAndLessonCounts(
  brand?: Brands | string
): Promise<SongAndLessonCounts> {
  const songsFilter = await f.combineAsync(
    f.typeIn(SONG_TYPES),
    f.statusIn(['published']),
    f.defined('railcontent_id'),
    brand ? f.brand(brand) : f.empty
  )

  const lessonsFilter = await f.combineAsync(
    f.defined('railcontent_id'),
    f.statusIn(['published']),
    f.combineOr(f.notDefined('parent_type'), 'count(parent_content_reference) == 0'),
    brand ? f.brand(brand) : f.empty
  )

  const q = `{
    "songs": count(${query().and(songsFilter)}),
    "lessons": count(${query().and(lessonsFilter)})
  }`

  const counts = (await sanityClient.executeQuery<Omit<SongAndLessonCounts, 'total'>>(q)) ?? {
    songs: 0,
    lessons: 0,
  }

  return { ...counts, total: counts.songs + counts.lessons }
}
