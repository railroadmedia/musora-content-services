/**
 * @module ProgressRow
 */
import { fetchUserPlaylists } from '../../content-org/playlists.js'
import { addContextToContent } from '../../contentAggregator.js'
import { fetchByRailContentIds } from '../../sanity.js'
import { postProcessBadge } from "../../../contentTypeConfig.js";

export async function getPlaylistCards(recentPlaylists){
  return await Promise.all(
    recentPlaylists.map((playlist) => {
      return processPlaylistItem(playlist)
    })
  )
}

export async function processPlaylistItem(item) {
  const playlist = item.playlist

  return {
    id: playlist.id,
    progressType: 'playlist',
    header: 'playlist',
    pinned: item.pinned ?? false,
    playlist: playlist,
    body: {
      first_items_thumbnail_url: playlist.first_items_thumbnail_url,
      title: playlist.name,
      subtitle: `${playlist.duration_formated} • ${playlist.total_items} items • ${playlist.likes} likes • ${playlist.user.display_name}`,
      total_items: playlist.total_items,
    },
    progressTimestamp: item.progressTimestamp,
    cta: {
      text: 'Continue',
      action: {
        brand: playlist.brand,
        item_id: playlist.navigateTo.id ?? null,
        content_id: playlist.navigateTo.content_id ?? null,
        type: 'playlists',
        // TODO deprecated, maintained to avoid breaking changes
        id: playlist.id,
      },
    },
  }
}

export async function getRecentPlaylists(brand, limit) {
  const response = await fetchUserPlaylists(brand, { sort: '-last_progress', limit: limit })
  const playlists = response?.data || []
  const recentPlaylists = playlists.filter((p) => p.last_progress && p.last_engaged_on)
  return await Promise.all(
    recentPlaylists.map(async (p) => {
      const utcDate = new Date(p.last_progress.replace(' ', 'T') + 'Z')
      const timestamp = utcDate.getTime()
      return {
        type: 'playlist',
        progressTimestamp: timestamp,
        playlist: p,
        id: p.id,
      }
    })
  )
}

export async function getPlaylistEngagedOnContent(recentPlaylists){
  const playlistEngagedOnContents = recentPlaylists.map(
    (item) => item.playlist.last_engaged_on
  )
  let contents = playlistEngagedOnContents.length > 0
    ? await addContextToContent(fetchByRailContentIds, playlistEngagedOnContents, 'progress-tracker', {
      addNavigateTo: true,
      addProgressStatus: true,
      addProgressPercentage: true,
      addProgressTimestamp: true,
    })
    : []
  contents = postProcessBadge(contents)
  return contents
}
