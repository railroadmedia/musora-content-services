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
 * @async
 * @function togglePlaylistPrivate
 * @param {string|number} playlistId - The unique identifier of the playlist to update.
 * @param {boolean} [is_private=true] - is public flag
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

// Unsupported playlist endpoints are here and will need to be implemented one by one
//
//
// /**
//  * Deletes a user’s playlist along with all associated items by sending a DELETE request to the API.
//  *
//  * This function calls the `/playlists/playlist` endpoint, where the server verifies the user’s ownership of the specified playlist.
//  * If the user is authorized, it deletes both the playlist and its associated items.
//  *
//  * @param {string|number} playlistId - The unique identifier of the playlist to be deleted.
//  *
//  * @returns {Promise<Object>} - A promise that resolves to an object containing:
//  *  - `success` (boolean): Indicates if the deletion was successful (`true` for success).
//  *  - `message` (string): Success confirmation message (e.g., "Playlist and associated items deleted successfully").
//  *
//  * If the user is unauthorized or the playlist does not exist, the promise rejects with an error.
//  *
//  * @example
//  * deletePlaylist(12345)
//  *   .then(response => {
//  *       if (response.success) {
//  *           console.log(response.message);
//  *       }
//  *   })
//  *   .catch(error => console.error('Error deleting playlist:', error));
//  */
// export async function deletePlaylist(playlistId) {
//   let url = `/playlists/playlist/${playlistId}`
//   return await fetchHandler(url, 'delete')
// }
//
// /**
//  * Updates a user’s playlist by sending a PUT request with updated data to the API.
//  *
//  * This function calls the `/playlists/playlist/{playlistId}` endpoint, where the server validates the incoming data
//  * and verifies that the authenticated user is the playlist owner. If authorized, it updates the playlist details with the provided data.
//  *
//  * @param {string|number} playlistId - The unique identifier of the playlist to be updated.
//  * @param {Object} updatedData - An object containing the playlist data to update. The possible fields include:
//  *  - `name` (string): The new name of the playlist (max 255 characters).
//  *  - `description` (string): A new description for the playlist (max 1000 characters).
//  *  - `category` (string): The updated category of the playlist (max 255 characters).
//  *  - `private` (boolean): Whether the playlist is private.
//  *  - `thumbnail_url` (string): The URL of the playlist thumbnail.
//  *
//  * @returns {Promise<Object>} - A promise that resolves to an object containing:
//  *  - `success` (boolean): Indicates if the update was successful (`true` for success).
//  *  - `message` (string): Success confirmation message if the update is successful.
//  *  - Other fields containing the updated playlist data.
//  *
//  * If the user is unauthorized or the data validation fails, the promise rejects with an error.
//  *
//  * @example
//  * updatePlaylist(12345, { name: "My New Playlist Name", description: "Updated description" })
//  *   .then(response => {
//  *       if (response.success) {
//  *           console.log(response.message);
//  *       }
//  *   })
//  *   .catch(error => console.error('Error updating playlist:', error));
//  */
// export async function updatePlaylist(playlistId, updatedData) {
//   const url = `/playlists/playlist/${playlistId}`
//   return await fetchHandler(url, 'PUT', null, updatedData)
// }
//
//
//
// /**
//  * Updates a playlist item with the provided data.
//  *
//  * @param {Object} updatedData - The data to update the playlist item with.
//  * @param {number} updatedData.user_playlist_item_id - The ID of the playlist item to update.
//  * @param {number} [updatedData.start_second] - (Optional) The start time in seconds for the item.
//  * @param {number} [updatedData.end_second] - (Optional) The end time in seconds for the item.
//  * @param {string} [updatedData.playlist_item_name] - (Optional) The new name for the playlist item.
//  * @param {number} [updatedData.position] - (Optional) The new position for the playlist item within the playlist.
//  * @returns {Promise<Object|null>} - A promise that resolves to an object containing:
//  *  - `success` (boolean): Indicates if the update was successful (`true` for success).
//  *  - `data` (Object): The updated playlist item data.
//  *
//  * Resolves to `null` if the request fails.
//  * @throws {Error} - Throws an error if the request fails.
//  *
//  * @example
//  * const updatedData = {
//  *   user_playlist_item_id: 123,
//  *   start_second: 30,
//  *   end_second: 120,
//  *   playlist_item_name: "Updated Playlist Item Name",
//  *   position: 2
//  * };
//  *
//  * updatePlaylistItem(updatedData)
//  *   .then(response => {
//  *     if (response.success) {
//  *       console.log("Playlist item updated successfully:", response.data);
//  *     }
//  *   })
//  *   .catch(error => {
//  *     console.error("Error updating playlist item:", error);
//  *   });
//  */
// export async function updatePlaylistItem(updatedData) {
//   const url = `/playlists/item`
//   return await fetchHandler(url, 'POST', null, updatedData)
// }
//
// /**
//  * Deletes a playlist item and repositions other items in the playlist if necessary.
//  *
//  * @param {Object} payload - The data required to delete the playlist item.
//  * @param {number} payload.user_playlist_item_id - The ID of the playlist item to delete.
//  * @returns {Promise<Object|null>} - A promise that resolves to an object containing:
//  *  - `success` (boolean): Indicates if the deletion was successful (`true` for success).
//  *  - `message` (string): A success message if the item is deleted successfully.
//  *  - `error` (string): An error message if the deletion fails.
//  *
//  * Resolves to `null` if the request fails.
//  * @throws {Error} - Throws an error if the request fails.
//  *
//  * @example
//  * const payload = {
//  *   user_playlist_item_id: 123
//  * };
//  *
//  * deletePlaylistItem(payload)
//  *   .then(response => {
//  *     if (response.success) {
//  *       console.log("Playlist item deleted successfully:", response.message);
//  *     } else {
//  *       console.error("Error:", response.error);
//  *     }
//  *   })
//  *   .catch(error => {
//  *     console.error("Error deleting playlist item:", error);
//  *   });
//  */
// export async function deletePlaylistItem(payload) {
//   const url = `/playlists/item`
//   return await fetchHandler(url, 'DELETE', null, payload)
// }
//
// /**
//  * Fetches detailed data for a specific playlist item, including associated Sanity and Assignment information if available.
//  *
//  * @param {Object} payload - The request payload containing necessary parameters.
//  * @param {number} payload.user_playlist_item_id - The unique ID of the playlist item to fetch.
//  * @returns {Promise<Object|null>} - A promise that resolves to an object with the fetched playlist item data, including:
//  *  - `success` (boolean): Indicates if the data retrieval was successful (`true` on success).
//  *  - `data` (Object): Contains the detailed playlist item data enriched with Sanity and Assignment details, if available.
//  *
//  * Resolves to `null` if the request fails.
//  * @throws {Error} - Throws an error if the request encounters issues during retrieval.
//  *
//  * @example
//  * const payload = { user_playlist_item_id: 123 };
//  *
//  * fetchPlaylistItem(payload)
//  *   .then(response => {
//  *     if (response?.success) {
//  *       console.log("Fetched playlist item data:", response.data);
//  *     } else {
//  *       console.log("Failed to fetch playlist item data.");
//  *     }
//  *   })
//  *   .catch(error => {
//  *     console.error("Error fetching playlist item:", error);
//  *   });
//  */
// export async function fetchPlaylistItem(payload) {
//   const playlistItemId = payload.user_playlist_item_id
//   const url = `/playlists/item/${playlistItemId}`
//   return await fetchHandler(url)
// }
