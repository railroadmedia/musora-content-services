/**
 * @typedef CreatePlaylistDTO
 * @property {string} name - The name of the new playlist. (required, max 255 characters)
 * @property {string} description - A description of the playlist. (optional, max 1000 characters)
 * @property {string} category - The category of the playlist.
 * @property {string} thumbnail_url - The URL of the playlist thumbnail. (optional, must be a valid URL)
 * @property {boolean} private - Whether the playlist is private. (optional, defaults to false)
 * @property {string} brand - Brand identifier for the playlist.
 */

/**
 * @typedef DuplicatePlaylistDTO
 * @property {string} name - The name of the new playlist. (required, max 255 characters)
 * @property {string} description - A description of the playlist. (optional, max 1000 characters)
 * @property {string} category - The category of the playlist.
 * @property {string} thumbnail_url - The URL of the playlist thumbnail. (optional, must be a valid URL)
 * @property {boolean} private - Whether the playlist is private. (optional, defaults to false)
 * @property {string} brand - Brand identifier for the playlist.
 * @property {array} items - Ids of playlist items to duplicate (in order)
 */

/**
 * @typedef Playlist
 * @property {number} id
 * @property {string} brand
 * @property {string} name
 * @property {string} description
 * @property {number} duplicated_count
 * @property {string} duration_formated
 * @property {Array<string>} first_4_items_thumbnail_url
 * @property {number} total_items
 * @property {number} likes
 * @property {boolean} pinned
 * @property {boolean} is_my_playlist
 * @property {User} user
 */

/**
 * @typedef AddItemToPlaylistDTO
 * @property {number} content_id - The ID of the content to add to the playlist(s).
 * @property {Array<number>} playlist_id - An array of playlist IDs where the content should be added.
 * @property {Array<number>} skip_duplicates - An array of playlist IDs to skip duplicated content
 * @property {number} position - Optional playlist position requirement
 * @property {boolean} import_high_routine - Flag to include high routine content.
 * @property {boolean} import_low_routine - Flag to include low routine content.
 */
