/**
 * @module Railcontent-Services
 */

const {globalConfig} = require('./config');

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = ['fetchUserLikes', 'postContentLiked', 'postContentUnliked'];


/**
 * Fetches the completion status of a specific lesson for the current user.
 *
 * @param {string} content_id - The ID of the lesson content to check.
 * @returns {Promise<Object|null>} - Returns the completion status object if found, otherwise null.
 * @example
 * fetchCurrentSongComplete('user123', 'lesson456', 'csrf-token')
 *   .then(status => console.log(status))
 *   .catch(error => console.error(error));
 */
export async function fetchCompletedState(content_id) {
    const url = `/content/user_progress/${globalConfig.railcontentConfig.userId}?content_ids[]=${content_id}`;

    const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': globalConfig.railcontentConfig.token
    };

    try {
        const response = await fetchAbsolute(url, {headers});
        const result = await response.json();

        if (result && result[content_id]) {
            return result[content_id];  // Return the correct object
        } else {
            return null;  // Handle unexpected structure
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}


/**
 * Fetches the completion status for multiple songs for the current user.
 *
 * @param {Array<string>} contentIds - An array of content IDs to check.
 * @returns {Promise<Object|null>} - Returns an object containing completion statuses keyed by content ID, or null if an error occurs.
 * @example
 * fetchAllCompletedStates('user123', ['song456', 'song789'], 'csrf-token')
 *   .then(statuses => console.log(statuses))
 *   .catch(error => console.error(error));
 */
export async function fetchAllCompletedStates(contentIds) {
    const url = `/content/user_progress/${globalConfig.railcontentConfig.userId}?${contentIds.map(id => `content_ids[]=${id}`).join('&')}`;

    const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': globalConfig.railcontentConfig.token
    };

    try {
        const response = await fetchAbsolute(url, {headers});
        const result = await response.json();
        if (result) {
            return result;
        } else {
            console.log('result not json');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

/**
 * Fetches a list of songs that are currently in progress for the current user.
 *
 * @param {string} brand - The brand associated with the songs.
 * @returns {Promise<Object|null>} - Returns an object containing in-progress songs if found, otherwise null.
 * @example
 * fetchSongsInProgress('drumeo')
 *   .then(songs => console.log(songs))
 *   .catch(error => console.error(error));
 */
export async function fetchSongsInProgress(brand) {
    const url = `/content/in_progress/${globalConfig.railcontentConfig.userId}?content_type=song&brand=${brand}`;

    const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': globalConfig.railcontentConfig.token
    };

    try {
        const response = await fetchAbsolute(url, {headers});
        const result = await response.json();
        if (result) {
            //console.log('fetchSongsInProgress', result);
            return result;
        } else {
            console.log('result not json');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

/**
 * Fetches a list of content that is currently in progress for the current user.
 *
 * @param {string} type - The content type associated with the content.
 * @param {string} brand - The brand associated with the content.
 * @param {number} [params.limit=20] - The limit of results per page.
 * @param {number} [params.page=1] - The page number for pagination.
 * @returns {Promise<Object|null>} - Returns an object containing in-progress content if found, otherwise null.
 * @example
 * fetchContentInProgress('song', 'drumeo')
 *   .then(songs => console.log(songs))
 *   .catch(error => console.error(error));
 */
export async function fetchContentInProgress(type = "all", brand, {page, limit} = {}) {
    let url;
    const limitString = limit ? `&limit=${limit}` : '';
    const pageString = page ? `&page=${page}` : '';

    if (type === "all") {
        url = `/content/in_progress/${globalConfig.railcontentConfig.userId}?brand=${brand}${limitString}${pageString}`;
    } else {
        url = `/content/in_progress/${globalConfig.railcontentConfig.userId}?content_type=${type}&brand=${brand}${limitString}${pageString}`;
    }
    const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': globalConfig.railcontentConfig.token
    };
    try {
        const response = await fetchAbsolute(url, {headers});
        const result = await response.json();
        if (result) {
            //console.log('contentInProgress', result);
            return result;
        } else {
            console.log('result not json');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

/**
 * Fetches a list of content that has been completed for the current user.
 *
 * @param {string} type - The content type associated with the content.
 * @param {string} brand - The brand associated with the content.
 * @param {number} [params.limit=20] - The limit of results per page.
 * @param {number} [params.page=1] - The page number for pagination.
 * @returns {Promise<Object|null>} - Returns an object containing in-progress content if found, otherwise null.
 * @example
 * fetchCompletedContent('song', 'drumeo')
 *   .then(songs => console.log(songs))
 *   .catch(error => console.error(error));
 */
export async function fetchCompletedContent(type = "all", brand, {page, limit} = {}) {
    let url;
    const limitString = limit ? `&limit=${limit}` : '';
    const pageString = page ? `&page=${page}` : '';

    if (type === "all") {
        url = `/content/completed/${globalConfig.railcontentConfig.userId}?brand=${brand}${limitString}${pageString}`;
    } else {
        url = `/content/completed/${globalConfig.railcontentConfig.userId}?content_type=${type}&brand=${brand}${limitString}${pageString}`;
    }
    const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': globalConfig.railcontentConfig.token
    };
    try {
        const response = await fetchAbsolute(url, {headers});
        const result = await response.json();
        if (result) {
            //console.log('completed content', result);
            return result;
        } else {
            console.log('result not json');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}


/**
 * Fetches user context data for a specific piece of content.
 *
 * @param {int} contentId - The content id.
 * @returns {Promise<Object|null>} - Returns an object containing user context data if found, otherwise null.
 * @example
 * fetchContentPageUserData(406548)
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 */
export async function fetchContentPageUserData(contentId) {
    let url = `/content/${contentId}/user_data/${globalConfig.railcontentConfig.userId}`;
    const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': globalConfig.railcontentConfig.token
    };

    try {
        const response = await fetchAbsolute(url, {headers});
        const result = await response.json();
        if (result) {
            console.log('fetchContentPageUserData', result);
            return result;
        } else {
            console.log('result not json');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

export async function fetchUserPermissions() {
    let url = `/content/user_data_permissions`;
    // in the case of an unauthorized user, we return empty permissions
    return fetchHandler(url, 'get') ?? [];
}

async function fetchDataHandler(url, dataVersion, method = "get") {
    return fetchHandler(url, method, dataVersion);
}

export async function fetchHandler(url, method = "get", dataVersion = null, body = null) {
    let headers = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': globalConfig.railcontentConfig.token,
    };
    if (dataVersion) headers['Data-Version'] = dataVersion;
    const options = {
        method,
        headers,
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    try {
        const response = await fetchAbsolute(url, options);
        const result = await response.json();
        if (result) {
            return result;
        } else {
            console.log('result not json');
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
    return null;
}

export async function fetchUserLikes(currentVersion) {
    let url = `/content/user/likes/all`;
    return fetchDataHandler(url, currentVersion);
}

export async function postContentLiked(contentId) {
    let url = `/content/user/likes/like/${contentId}`;
    return await fetchHandler(url, "post");
}

export async function postContentUnliked(contentId) {
    let url = `/content/user/likes/unlike/${contentId}`;
    return await fetchHandler(url, "post");
}

export async function fetchChallengeMetadata(contentId) {
    let url = `/challenges/${contentId}`;
    return await fetchHandler(url, 'get');
}

export async function fetchUserChallengeProgress(contentId) {
    let url = `/challenges/user_data/${contentId}`;
    return await fetchHandler(url, 'get');
}

export async function fetchUserAward(contentId) {
    let url = `/challenges/download_award/${contentId}`;
    return await fetchHandler(url, 'get');
}

export async function postChallengesSetStartDate(contentId, startDate) {
    let url = `/challenges/set_start_date/${contentId}?start_date=${startDate}`;
    return await fetchHandler(url, 'post');
}

export async function postChallengesUnlock(contentId) {
    let url = `/challenges/unlock/${contentId}`;
    return await fetchHandler(url, 'post');
}

export async function postChallengesEnroll(contentId) {
    let url = `/challenges/enroll/${contentId}`;
    return await fetchHandler(url, 'post');
}

export async function postChallengesLeave(contentId) {
    let url = `/challenges/leave/${contentId}`;
    return await fetchHandler(url, 'post');
}

/**
 * Fetches user playlists for a specific brand.
 *
 * It allows optional pagination and sorting parameters to control the result set.
 *
 * @param {string} brand - The brand identifier for which playlists are being fetched.
 * @param {number} [params.limit=10] - The maximum number of playlists to return per page (default is 10).
 * @param {number} [params.page=1] - The page number for pagination.
 * @param {number} [params.sort='-created_at'] - The sorting order for the playlists (default is by created_at in descending order).
 *
 * @returns {Promise<Object|null>} - A promise that resolves to the response from the API, containing the user playlists data.
 *
 * @example
 * fetchUserPlaylists('drumeo', { page: 1, sort: 'name' })
 *   .then(playlists => console.log(playlists))
 *   .catch(error => console.error(error));
 */
export async function fetchUserPlaylists(brand, {page, limit, sort} = {}) {
    let url;
    const limitString = limit ? `&limit=${limit}` : '';
    const pageString = page ? `&page=${page}` : '';
    url = `/playlists/all?brand=${brand}${limitString}${pageString}`;
    return await fetchHandler(url);
}

/**
 * Duplicates an existing playlist by sending a POST request to the API.
 *
 * This function calls the `/playlists/duplicate` endpoint, where the server replicates the specified playlist,
 * including its items. Optionally, new name, description, category, or thumbnail_url parameters can be provided
 * to customize the duplicated playlist. If new name is not provided, the server appends " (Duplicate)" to the original name.
 *
 * @param {string|number} playlistId - The unique identifier of the playlist to be duplicated.
 *
 * @returns {Promise<Object>} - A promise that resolves to the duplicated playlist data, or rejects with an error if the duplication fails.
 *
 * The duplicated playlist contains:
 *  - `name`: Name of the new playlist (original name + " (Duplicate)" if not specified).
 *  - `description`: Description of the duplicated playlist (same as original if not specified).
 *  - `category`: Category of the duplicated playlist (same as original if not specified).
 *  - `thumbnail_url`: URL of the playlist thumbnail (same as original if not specified).
 *  - `items`: A list of items (songs, tracks, etc.) copied from the original playlist.
 *
 * @example
 * postDuplicatePlaylist(12345)
 *   .then(duplicatedPlaylist => console.log(duplicatedPlaylist))
 *   .catch(error => console.error('Error duplicating playlist:', error));
 */
export async function duplicatePlaylist(playlistId) {
    let url = `/playlists/duplicate`;
    const payload = { playlist_id: playlistId };
    return await fetchHandler(url, "post",null, payload);
}

/**
 * Deletes a user’s playlist along with all associated items by sending a DELETE request to the API.
 *
 * This function calls the `/playlists/playlist` endpoint, where the server verifies the user’s ownership of the specified playlist.
 * If the user is authorized, it deletes both the playlist and its associated items.
 *
 * @param {string|number} playlistId - The unique identifier of the playlist to be deleted.
 *
 * @returns {Promise<Object>} - A promise that resolves to a confirmation message if the deletion is successful,
 * or rejects with an error if the user is unauthorized or if the playlist does not exist.
 *
 * The server response includes:
 *  - `message`: Success confirmation message (e.g., "Playlist and associated items deleted successfully").
 *
 * @example
 * deletePlaylist(12345)
 *   .then(response => console.log(response.message))
 *   .catch(error => console.error('Error deleting playlist:', error));
 */
export async function deletePlaylist(playlistId) {
    let url = `/playlists/playlist`;
    const payload = { playlist_id: playlistId };
    return await fetchHandler(url, "delete",  null, payload);
}

/**
 * Updates a user’s playlist by sending a PUT request with updated data to the API.
 *
 * This function calls the `/playlists/playlist/{playlistId}` endpoint, where the server validates the incoming data
 * and verifies that the authenticated user is the playlist owner. If authorized, it updates the playlist details with the provided data.
 *
 * @param {string|number} playlistId - The unique identifier of the playlist to be updated.
 * @param {Object} updatedData - An object containing the playlist data to update. The possible fields include:
 *  - `name` (string): The new name of the playlist (max 255 characters).
 *  - `description` (string): A new description for the playlist (max 1000 characters).
 *  - `category` (string): The updated category of the playlist (max 255 characters).
 *  - `private` (boolean): Whether the playlist is private.
 *  - `thumbnail_url` (string): The URL of the playlist thumbnail.
 *
 * @returns {Promise<Object>} - A promise that resolves to the updated playlist data if successful, or an error response if the user is unauthorized or the data validation fails.
 *
 * @example
 * updatePlaylist(12345, { name: "My New Playlist Name", description: "Updated description" })
 *   .then(response => console.log(response.message))
 *   .catch(error => console.error('Error updating playlist:', error));
 */
export async function updatePlaylist(playlistId, updatedData) {
    const url = `/playlists/playlist/${playlistId}`;
    return await fetchHandler(url, "PUT", null, updatedData);
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
    const url = `/playlists/playlist`;
    return await fetchHandler(url, "POST", null, playlistData);
}

/**
 * Sends a request to "like" a playlist on behalf of the authenticated user.
 *
 * This function calls the `/playlists/playlist/like` endpoint, where the server validates the `playlist_id` and checks
 * if the authenticated user has already liked the playlist. If not, it creates a new "like" entry associated with the playlist.
 *
 * @param {string|number} playlistId - The unique identifier of the playlist to be liked.
 *
 * @returns {Promise<Object>} - A promise that resolves with the response from the API. The response may contain:
 *  - `message` (string): A success message if the playlist is liked successfully, or a notification if the playlist is already liked.
 *  - `like` (Object|null): Details of the created "like" entry if the playlist is newly liked, or null if it was already liked.
 *
 * The `like` object in the response includes:
 *  - `playlist_id`: The ID of the liked playlist.
 *  - `user_id`: The ID of the user who liked the playlist.
 *  - `brand`: The brand associated with the like.
 *  - `created_at`: Timestamp of when the like was created.
 *
 * @example
 * likePlaylist(12345)
 *   .then(response => console.log(response.message))
 *   .catch(error => console.error('Error liking playlist:', error));
 */
export async function likePlaylist(playlistId) {
    const url = `/playlists/playlist/like`;
    const payload = { playlist_id: playlistId };
    return await fetchHandler(url, "PUT", null, payload);
}

/**
 * Removes a "like" from a playlist for the authenticated user.
 *
 * This function sends a DELETE request to the `/playlists/like` endpoint, where the server validates the `playlist_id`
 * and checks if a like by the authenticated user already exists for the specified playlist. If so, it deletes the like.
 *
 * @param {string|number} playlistId - The unique identifier of the playlist whose like is to be removed.
 *
 * @returns {Promise<Object>} - A promise that resolves with the response from the API. The response may contain:
 *  - `message` (string): A success message if the playlist like is removed successfully or a notification if the playlist was not liked.
 *
 * @example
 * deletePlaylistLike(12345)
 *   .then(response => console.log(response.message))
 *   .catch(error => console.error('Error removing playlist like:', error));
 */
export async function deletePlaylistLike(playlistId) {
    const url = `/playlists/like`;
    const payload = { playlist_id: playlistId };
    return await fetchHandler(url, "DELETE", null, payload);
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
    const url = `/playlists/playlist?playlist_id=${playlistId}`;
    return await fetchHandler(url, "GET");
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
    const url = `/playlists/playlist-lessons?playlist_id=${playlistId}`;
    return await fetchHandler(url, "GET");
}

function fetchAbsolute(url, params) {
    if (globalConfig.railcontentConfig.baseUrl) {
        if (url.startsWith('/')) {
            return fetch(globalConfig.railcontentConfig.baseUrl + url, params)
        }
    }
    return fetch(url, params);
}
