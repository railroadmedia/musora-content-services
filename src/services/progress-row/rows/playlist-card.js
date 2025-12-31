/**
 * @module ProgressRow
 */
import { fetchUserPlaylists } from '../../content-org/playlists.js'
import { addContextToContent } from '../../contentAggregator.js'
import { fetchByRailContentIds } from '../../sanity.js'

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
        // TODO depreciated, maintained to avoid breaking changes
        id: playlist.id,
      },
    },
  }
}

export async function getRecentPlaylists(brand, limit) {
  // TODO: clean up these docstrings
  // fetch recent playlists, filter out those that do not have recent engagement, map all to some custom object
  const response = await fetchUserPlaylists(brand, { sort: '-last_progress', limit: limit })
  const playlists = response?.data || []
  const recentPlaylists = playlists.filter((p) => p.last_progress && p.last_engaged_on)
  // why this?
  return await Promise.all(
    recentPlaylists.map(async (p) => {
      const utcDate = new Date(p.last_progress.replace(' ', 'T') + 'Z')
      const timestamp = utcDate.getTime()
      return {
        type: 'playlist',
        // Content timestamps are millisecond accurate so for comparison we bring this to the same resolution
        progressTimestamp: timestamp / 1000,
        playlist: p,
        id: p.id,
      }
    })
  )
}

export async function getPlaylistEngagedOnContent(recentPlaylists){
  // take the most recently engaged with video in a playlist and hydrate it with
  // the content details
  const playlistEngagedOnContents = recentPlaylists.map(
    (item) => item.playlist.last_engaged_on
  )
  return playlistEngagedOnContents.length > 0
    ? await addContextToContent(fetchByRailContentIds, playlistEngagedOnContents, 'progress-tracker', {
      addNavigateTo: true,
      addProgressStatus: true,
      addProgressPercentage: true,
      addProgressTimestamp: true,
    })
    : []
}
