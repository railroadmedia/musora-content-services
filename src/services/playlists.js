import {PlaylistsContext, ContentVersionKey} from "./playlistsContext";

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = [];

export let playlistsContext = new PlaylistsContext(ContentVersionKey, fetchUserLikes);
export async function createPlaylist() {

}
export async function addItemToPlaylist(contentId, playlistId) {

}
