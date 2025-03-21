/**
 * @typedef CreatePlaylistDTO
 * @property {string} name - The name of the new playlist. (required, max 255 characters)
 * @property {string} description - A description of the playlist. (optional, max 1000 characters)
 * @property {string} category - The category of the playlist.
 * @property {string} thumbnail_url - The URL of the playlist thumbnail. (optional, must be a valid URL)
 * @property {boolean} private - Whether the playlist is private. (optional, defaults to true)
 * @property {string} brand - Brand identifier for the playlist.
 */

/**
 * @typedef Playlist
 * @property {number} id
 * @property {string} brand
 * @property {string} name
 * @property {string} description
 * @property {string|null} thumbnail_url
 * @property {string} duration_formated
 * @property {Array<string>} first_4_items_thumbnail_url
 * @property {string|null} url
 * @property {string|null} playback_url
 * @property {number} total_items
 * @property {User} user
 */

/**
 * @typedef AddItemToPlaylistDTO
 * @property {number} content_id - The ID of the content to add to the playlist(s).
 * @property {Array<number>} playlist_id - An array of playlist IDs where the content should be added.
 * @property {boolean} import_full_soundslice_assignment - Flag to include full Soundslice assignments.
 * @property {boolean} import_instrumentless_soundslice_assignment - Flag to include instrumentless Soundslice assignments.
 * @property {boolean} import_high_routine - Flag to include high routine content.
 * @property {boolean} import_low_routine - Flag to include low routine content.
 * @property {boolean} import_all_assignments - Flag to include all Soundslice assignments if true.
 */
