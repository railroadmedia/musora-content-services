/**
 * @module Content-Organization
 * @namespace Playlists
 */
import { fetchHandler } from '../railcontent'
import { globalConfig } from './config.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

const BASE_URL = `${globalConfig.railcontentConfig.baseUrl}/api/content-org`

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
  { page, limit, sort, searchTerm, content_id, categories } = {}
) {
  let url
  const limitString = limit ? `&limit=${limit}` : ''
  const pageString = page ? `&page=${page}` : ''
  const sortString = sort ? `&sort=${sort}` : ''
  const searchFilter = searchTerm ? `&term=${searchTerm}` : ''
  const content = content_id ? `&content_id=${content_id}` : ''
  const categoryString =
    categories && categories.length ? categories.map((cat) => `categories[]=${cat}`).join('&') : ''
  url = `${BASE_URL}/v1/user/playlists?brand=${brand}${limitString}${pageString}${sortString}${searchFilter}${content}${categoryString ? `&${categoryString}` : ''}`
  return await fetchHandler(url)
}

/**
 * Creates a new user playlist by sending a POST request with playlist data to the API.
 *
 * This function calls the `/playlists/playlist` endpoint, where the server validates the incoming data and associates
 * the new playlist with the authenticated user. The `name` field is required, while other fields are optional.
 *
 * @param {Object} playlistData - An object containing data to create the playlist. The fields include:
 *  - `name` (string): The name of the new playlist (required, max 255 characters).
 *  - `description` (string): A description of the playlist (optional, max 1000 characters).
 *  - `category` (string): The category of the playlist.
 *  - `thumbnail_url` (string): The URL of the playlist thumbnail (optional, must be a valid URL).
 *  - `private` (boolean): Whether the playlist is private (optional, defaults to true).
 *  - `brand` (string): Brand identifier for the playlist.
 *
 * @returns {Promise<Object>} - A promise that resolves to the created playlist data if successful, or an error response if validation fails.
 *
 * The server response includes:
 *  - `message`: Success message indicating playlist creation (e.g., "Playlist created successfully").
 *  - `playlist`: The data for the created playlist, including the `user_id` of the authenticated user.
 *
 * @example
 * createPlaylist({ name: "My Playlist", description: "A cool playlist", private: true })
 *   .then(response => console.log(response.message))
 *   .catch(error => console.error('Error creating playlist:', error));
 */
export async function createPlaylist(playlistData) {
  const url = `${BASE_URL}/v1/user/playlists`
  return await fetchHandler(url, 'POST', null, playlistData)
}

/**
 * Adds an item to one or more playlists by making a POST request to the `/playlists/add-item` endpoint.
 *
 * @param {Object} payload - The request payload containing necessary parameters.
 * @param {number} payload.content_id - The ID of the content to add to the playlist(s).
 * @param {Array<number>} payload.playlist_id - An array of playlist IDs where the content should be added.
 * @param {boolean} [payload.import_full_soundslice_assignment=false] - Flag to include full Soundslice assignments.
 * @param {boolean} [payload.import_instrumentless_soundslice_assignment=false] - Flag to include instrumentless Soundslice assignments.
 * @param {boolean} [payload.import_high_routine=false] - Flag to include high routine content.
 * @param {boolean} [payload.import_low_routine=false] - Flag to include low routine content.
 * @param {boolean} [payload.import_all_assignments=false] - Flag to include all Soundslice assignments if true.
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
  const url = `${BASE_URL}/v1/user/playlists/items`
  return await fetchHandler(url, 'POST', null, payload)
}
