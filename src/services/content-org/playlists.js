/**
 * @module Playlists
 */
import { globalConfig } from '../config.js'
import { fetchHandler } from '../railcontent.js'
import './playlists-types.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

const BASE_PATH = `/api/content-org`

/**
 * Fetches user playlists for a specific brand.
 *
 * Allows optional pagination, sorting, and search parameters to control the result set.
 *
 * @param {string} brand - The brand identifier for which playlists are being fetched.
 * @param {number} [params.limit=10] - The maximum number of playlists to return per page (default is 10).
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {string} [params.sort='-created_at'] - The sorting order for the playlists (default is by created_at in descending order).
 * @param {int|string} [params.content_id] - If content_id exists, the endpoint checks in each playlist if we have the content in the items.
 *
 * @returns {Promise<Object|null>} - A promise that resolves to the response from the API, containing the user playlists data.
 *
 * @example
 * fetchUserPlaylists('drumeo', { page: 1, sort: 'name', searchTerm: 'rock' })
 *   .then(playlists => console.log(playlists))
 *   .catch(error => console.error(error));
 */
export async function fetchUserPlaylists(
  brand,
  { page, limit, sort, content_id } = {}
) {
  const pageString = page ? `?page=${page}` : '?page=1'
  const limitString = limit ? `&limit=${limit}` : ''
  const sortString = sort ? `&sort=${sort}` : ''
  const content = content_id ? `&content_id=${content_id}` : ''
  const brandString = brand ? `&brand=${brand}` : ''
  const url = `${BASE_PATH}/v1/user/playlists${pageString}${brandString}${limitString}${sortString}${content}`
  return await fetchHandler(url)
}

/**
 * Creates a new user playlist by sending a POST request with playlist data to the API.
 *
 * This function calls the `/playlists/playlist` endpoint, where the server validates the incoming data and associates
 * the new playlist with the authenticated user. The `name` field is required, while other fields are optional.
 *
 * @param {CreatePlaylistDTO} playlistData - An object containing data to create the playlist. The fields include:
 *  - `name` (string): The name of the new playlist (required, max 255 characters).
 *  - `description` (string): A description of the playlist (optional, max 1000 characters).
 *  - `category` (string): The category of the playlist.
 *  - `private` (boolean): Whether the playlist is private (optional, defaults to false).
 *  - `brand` (string): Brand identifier for the playlist.
 *
 * @returns {Promise<Playlist>} - A promise that resolves to the created playlist data if successful, or an error response if validation fails.
 *
 * @example
 * createPlaylist({ name: "My Playlist", description: "A cool playlist", private: true })
 *   .then(response => console.log(response))
 *   .catch(error => console.error('Error creating playlist:', error));
 */
export async function createPlaylist(playlistData) {
  const url = `${BASE_PATH}/v1/user/playlists`
  return await fetchHandler(url, 'POST', null, playlistData)
}

/**
 * Soft deletes a playlist. Will cascade and also soft delete entries in other playlist tables (pinned, reported, liked,
 * playlist content) and last engaged that have this playlist id
 * @param {id} playlist - the id of the playlist you want to soft delete.
 * @returns {Promise<any|string|null>}
 */
export async function deletePlaylist(playlist) {
  const url = `${BASE_PATH}/v1/user/playlists/delete/${playlist}`
  return await fetchHandler(url, 'POST', null, playlist)
}

/**
 * Soft restores a playlist. Will cascade and also soft restore entries in other playlist tables (pinned, reported, liked,
 * playlist content) and last engaged that have this playlist id
 * @param {id} playlist - the id of the playlist you want to soft restore.
 * @returns {Promise<any|string|null>}
 */
export async function undeletePlaylist(playlist) {
  const url = `${BASE_PATH}/v1/user/playlists/undelete/${playlist}`
  return await fetchHandler(url, 'POST', null, playlist)
}


/**
 * Likes a playlist for the current user.
 *
 * @async
 * @function likePlaylist
 * @param {string|number} playlistId - The unique identifier of the playlist to like.
 *
 * @returns {Promise<Object>}
 *
 * @example
 * // Like playlist with ID '123'
 * try {
 *   const response = await likePlaylist('123');
 *   console.log('Playlist liked successfully:', response);
 * } catch (error) {
 *   console.error('Failed to like playlist:', error);
 * }
 */
export async function likePlaylist(playlistId) {
  const url = `${BASE_PATH}/v1/user/playlists/like/${playlistId}`
  return await fetchHandler(url, 'PUT')
}

/**
 * Unlikes a previously liked playlist.
 * @async
 * @function unlikePlaylist
 * @param {string|number} playlistId - The unique identifier of the playlist to unlike.
 *
 * @returns {Promise<Object>}
 *
 *
 * @example
 * // Unlike playlist with ID '123'
 * try {
 *   const response = await unlikePlaylist('123');
 *   console.log('Playlist unliked successfully:', response);
 * } catch (error) {
 *   console.error('Failed to unlike playlist:', error);
 * }
 */
export async function unlikePlaylist(playlistId) {
  const url = `${BASE_PATH}/v1/user/playlists/like/${playlistId}`
  return await fetchHandler(url, 'DELETE')
}

/**
 * Reports a playlist
 *
 * @async
 * @function reportPlaylist
 * @param {string|number} playlistId - The unique identifier of the playlist to report.
 *
 * @returns {Promise<Object>}
 *
 * @example
 * // Report playlist with ID '123'
 * try {
 *   const response = await reportPlaylist('123');
 *   console.log('Playlist reported successfully:', response);
 * } catch (error) {
 *   console.error('Failed to report playlist:', error);
 * }
 */
export async function reportPlaylist(playlistId) {
  const url = `${BASE_PATH}/v1/user/playlists/report/${playlistId}`
  return await fetchHandler(url, 'POST')
}

/**
 * Adds an item to one or more playlists
 *
 * @param {AddItemToPlaylistDTO} payload - The request payload containing necessary parameters.
 *
 * @returns {Promise<Object|null>} - A promise that resolves to an object with the response data, including:
 *  - `added` (Array): Playlist ids that we were success
 *  - `limit_exceeded` (Array): A list of playlists where the item limit was exceeded, if any.
 *  - `unauthorized` (Array): A list of successfully added items (empty if none).
 *
 * Resolves to `null` if the request fails.
 * @throws {Error} - Throws an error if the request encounters issues during the operation.
 *
 * @example
 * const payload = {
 *     content_id: 123,
 *     playlist_id: [1, 2, 3],
 *     position: 2,
 *
 * };
 *
 * addItemToPlaylist(payload)
 *   .then(response => {
 *     if (response?.success) {
 *       console.log("Item(s) added to playlist successfully");
 *     }
 *     if (response?.limit_exceeded) {
 *       console.warn("Some playlists exceeded the item limit:", response.limit_exceeded);
 *     }
 *   })
 *   .catch(error => {
 *     console.error("Error adding item to playlist:", error);
 *   });
 */
export async function addItemToPlaylist(payload) {
  const url = `${BASE_PATH}/v1/user/playlists/items`
  return await fetchHandler(url, 'POST', null, payload)
}

/**
 * Toggles a playlists public/private state
 *
 * @param {string|number} playlistId
 * @param {Boolean} is_private - flag for private/public

 * @returns {Promise<Playlist>} - A promise that resolves to the updated playlist data if successful, or an error response if validation fails.
 *
 * @example
 * togglePlaylistPrivate(11541, true)
 *   .then(response => console.log(response))
 *   .catch(error => console.error('Error creating playlist:', error));
 */
export async function togglePlaylistPrivate(playlistId, is_private)
{
  return await updatePlaylist(playlistId, {is_private})
}


/**
 * Updates a playlists values
 *
 * @param {string|number} playlistId
 * @param {Object} updateData - An object containing fields to update on the playlist:
 *  - `name` (string): The name of the new playlist (required, max 255 characters).
 *  - `description` (string): A description of the playlist (optional, max 1000 characters).
 *  - `category` (string): The category of the playlist.
 * + *  - `deleted_items` (array): List of playlist item IDs to delete.
 * + *  - `item_order` (array): Updated order of playlist items (ids, not railcontent_ids).
 *
 * @returns {Promise<object>} - A promise that resolves to the created playlist data and lessons if successful, or an error response if validation fails.
 *
 * The server response includes:
 *  - `playlist`: Playlist metadata (same as fetchPlaylist)
 *  - `lessons`: Updated list of plalyist lessons  (same as fetchPlaylistItems)
 *
 * @example
 * updatePlaylist(661113 { name: "My Playlist", description: "A cool playlist", is_private: true, deleted_items : [2189832, 221091] })
 *   .then(response => console.log(response.playlist); console.log(response.lessons))
 *   .catch(error => console.error('Error updating playlist:', error));
 */
export async function updatePlaylist(playlistId, {
  name = null, description = null,  is_private = null, brand = null, category = null, deleted_items = null, item_order = null
})
{
  const data = {
    ...name && { name },
    ...description && { description },
    ...is_private !== null && { private: is_private},
    ...brand && { brand },
    ...category && { category},
    ...deleted_items && { deleted_items },
    ...item_order && { item_order },
  }
  const url = `${BASE_PATH}/v1/user/playlists/${playlistId}`
  return await fetchHandler(url, 'PUT', null, data);
}

/**
 * Delete Items from playlist
 *
 * @async
 * @function togglePlaylistPrivate
 * @param {string|number} playlistId - The unique identifier of the playlist to update.
 * @param {array} deleted_items - list of playlist ids to delete (user_playlist_item_id, not the railcontent_id)
 *
 * @returns {Promise<Object>}
 *
 * @example
 * // Delete items 8462221 and 8462222 from playlist 81111
 * try {
 *   const response = await deleteItemsFromPlaylist(81111, [8462221, 8462222]);
 * } catch (error) {
 *   console.error('Failed to delete playlist items:', error);
 * }
 */
export async function deleteItemsFromPlaylist(playlistId, deleted_items) {
  return await updatePlaylist(playlistId, {deleted_items})
}

/**
 * Duplicates a playlist and playlist items for the provided playlistID for the authorized user
 *
 * @param {string|number} playlistId
 * @param {CreatePlaylistDTO} playlistData - An object containing data to create the playlist. The fields include:
 *  - `name` (string): The name of the new playlist (required, max 255 characters).
 *  - `description` (string): A description of the playlist (optional, max 1000 characters).
 *  - `category` (string): The category of the playlist.
 *  - `private` (boolean): Whether the playlist is private (optional, defaults to false).
 *  - `brand` (string): Brand identifier for the playlist.
 *
 * @returns {Promise<Playlist>}
 * @example
 * duplicatePlaylist(81167, { name: "My Playlist (Duplicate)", description: "A cool playlist", private: true })
 *   .then(response => console.log(response))
 *   .catch(error => console.error('Error creating playlist:', error));
 */
export async function duplicatePlaylist(playlistId, playlistData) {
  const url = `${BASE_PATH}/v1/user/playlists/duplicate/${playlistId}`
  return await fetchHandler(url, 'POST', null, playlistData)
}

/**
 * Retrieves details of a specific playlist by its ID.
 *
 * This function sends a GET request to the `/playlists/playlist` endpoint with a specified playlist ID.
 * The server validates the user's access to the playlist and returns playlist details if the user is authorized.
 *
 * @param {string|number} playlistId - The unique identifier of the playlist to retrieve.
 *
 * @returns {Promise<Object>} - A promise that resolves to the response from the API, containing:
 *  - `data` (Object): The playlist details, or an error message if access is denied or the playlist is not found.
 *
 * @example
 * fetchPlaylist(12345)
 *   .then(response => console.log(response.data))
 *   .catch(error => console.error('Error fetching playlist:', error));
 */
export async function fetchPlaylist(playlistId) {
  const url = `${BASE_PATH}/v1/user/playlists/${playlistId}`
  return await fetchHandler(url, 'GET')
}

/**
 * Retrieves items within a specified playlist by playlist ID.
 *
 * This function sends a GET request to the `/playlists/playlist-lessons` endpoint to fetch items in the given playlist.
 * The server combines data from the playlist and additional metadata from Sanity to enhance item details.
 *
 * @param {string|number} playlistId - The unique identifier of the playlist whose items are to be fetched.
 *
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of playlist items
 *
 * @example
 * fetchPlaylistItems(12345)
 *   .then(items => console.log(items))
 *   .catch(error => console.error('Error fetching playlist items:', error));
 */
export async function fetchPlaylistItems(playlistId) {
  const url = `${BASE_PATH}/v1/user/playlists/items/${playlistId}`
  return await fetchHandler(url, 'GET')
}
