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
 * @param {string} [params.searchTerm] - A search term to filter playlists by name.
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
  let url
  console.log({ config: globalConfig.baseUrl })
  const limitString = limit ? `&limit=${limit}` : ''
  const pageString = page ? `&page=${page}` : ''
  const sortString = sort ? `&sort=${sort}` : ''
  const content = content_id ? `&content_id=${content_id}` : ''
  url = `${BASE_PATH}/v1/user/playlists?brand=${brand}${limitString}${pageString}${sortString}${searchFilter}${content}${categoryString ? `&${categoryString}` : ''}`
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
 * Adds an item to one or more playlists by making a POST request to the `/playlists/add-item` endpoint.
 *
 * @param {AddItemToPlaylistDTO} payload - The request payload containing necessary parameters.
 *
 * @returns {Promise<Object|null>} - A promise that resolves to an object with the response data, including:
 *  - `success` (boolean): Indicates if the items were added successfully (`true` on success).
 *  - `limit_excedeed` (Array): A list of playlists where the item limit was exceeded, if any.
 *  - `successful` (Array): A list of successfully added items (empty if none).
 *
 * Resolves to `null` if the request fails.
 * @throws {Error} - Throws an error if the request encounters issues during the operation.
 *
 * @example
 * const payload = {
 *     content_id: 123,
 *     playlist_id: [1, 2, 3],
 *     import_all_assignments: true
 * };
 *
 * addItemToPlaylist(payload)
 *   .then(response => {
 *     if (response?.success) {
 *       console.log("Item(s) added to playlist successfully");
 *     }
 *     if (response?.limit_excedeed) {
 *       console.warn("Some playlists exceeded the item limit:", response.limit_excedeed);
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
 * Updates a playlist's privacy setting by toggling its public/private status.
 *
 * This function sends a POST request to the playlist update endpoint to change
 * whether a playlist is publicly visible or private. The function internally inverts
 * the provided `is_public` parameter to set the `private` field in the payload.
 *
 * @async
 * @function togglePlaylistPrivate
 * @param {string|number} playlistId - The unique identifier of the playlist to update.
 * @param {boolean} [is_public=true] - is public flag
 *
 * @returns {Promise<Object>}
 *
 * @example
 * // Make playlist with ID '81111' public
 * try {
 *   const response = await togglePublic(81111, true);
 *   console.log('Playlist is now private:', response);
 * } catch (error) {
 *   console.error('Failed to update playlist visibility:', error);
 * }
 */
export async function togglePlaylistPrivate(playlistId, is_private = true) {
  const url = `${BASE_PATH}/v1/user/playlists/update/${playlistId}`
  const payload = {
    private: is_private,
  }
  return await fetchHandler(url, 'POST', null, payload)
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
 * Reorders items within a playlist.
 * @async
 * @function reorderPlaylistItems
 * @param {string|number} playlistId - The unique identifier of the playlist to reorder.
 * @param {Array<string|number>} playlistItemIds - An array of playlist item IDs (not content ids) in the desired order.
 *                                              All items in the playlist must present in this list for the BE to handle the reorder.
 *
 * @returns {Promise<Object>}
 * @example
 * // Reorder items in playlist with ID '123'
 * try {
 *   const newOrder = [5, 2, 1, 4, 3]; // Representing playlist item IDs in the desired order
 *   const response = await reorderPlaylistItems('123', newOrder);
 *   console.log('Playlist items reordered successfully:', response);
 * } catch (error) {
 *   console.error('Failed to reorder playlist items:', error);
 * }
 */
export async function reorderPlaylistItems(playlistId, playlistItemIds){
  const url = `${BASE_PATH}/v1/user/playlists/reorder/${playlistId}`
  const payload = {
    items: playlistItemIds,
  }
  return await fetchHandler(url, 'POST')
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
