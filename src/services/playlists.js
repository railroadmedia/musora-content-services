import {PlaylistsContext, ContentVersionKey} from "./playlistsContext";
import {fetchUserPlaylists} from "./railcontent";

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = [];

export let playlistsContext = new PlaylistsContext(ContentVersionKey, fetchUserPlaylists);
export async function createPlaylist() {

}
export async function addItemToPlaylist(contentId, playlistId) {

}
