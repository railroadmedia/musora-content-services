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

export async function postDuplicatePlaylist(playlistId) {
    let url = `/playlists/duplicate`;
    const payload = { playlist_id: playlistId };
    return await fetchHandler(url, "post",null, payload);
}

export async function deletePlaylist(playlistId) {
    let url = `/playlists/playlist`;
    const payload = { playlist_id: playlistId };
    return await fetchHandler(url, "delete",  null, payload);
}

export async function updatePlaylist(playlistId, updatedData) {
    const url = `/playlists/playlist/${playlistId}`;
    return await fetchHandler(url, "PUT", null, updatedData);
}

export async function createPlaylist(playlistData) {
    const url = `/playlists/playlist`;
    return await fetchHandler(url, "POST", null, playlistData);
}

export async function likePlaylist(playlistId) {
    const url = `/playlists/playlist/like`;
    const payload = { playlist_id: playlistId };
    return await fetchHandler(url, "PUT", null, payload);
}

export async function deletePlaylistLike(playlistId) {
    const url = `/playlists/like`;
    const payload = { playlist_id: playlistId };
    return await fetchHandler(url, "DELETE", null, payload);
}

export async function fetchPlaylist(playlistId) {
    const url = `/playlists/playlist?playlist_id=${playlistId}`;
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
