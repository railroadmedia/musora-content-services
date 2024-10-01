/**
 * @module Railcontent-Services
 */

const {globalConfig} = require('./config');


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
 * Fetches the vimeo meta-data
 *
 * @param {string} vimeo_id - The vimeo id, found in the <document>.video.external_id field for lessons
 * @returns {Promise<Object|null>} - Returns the
 * @example
 * fetchVimeoData('642900215')
 *   .then(vimeoData => console.log(vimeoData))
 *   .catch(error => console.error(error));
 */
export async function fetchVimeoData(vimeo_id) {
    const url = `/content/vimeo-data/${vimeo_id}`;

    const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': globalConfig.railcontentConfig.token
    };

    try {
        const response = await fetchAbsolute(url, {headers});
        const result = await response.json();

        if (result) {
            return result;  // Return the correct object
        } else {
            console.log('Invalid result structure', result);
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
    //TODO: Should be investigate why throw 500 errors on MA
    return [];
    let url = `/content/user_data_permissions`;
    const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': globalConfig.railcontentConfig.token
    };
    // in the case of an unauthorized user, we return empty permissions
    return fetchHandler(url, 'get') ?? [];
}

async function fetchDataHandler(url, dataVersion, method = "get") {
    return fetchHandler(url, method, dataVersion);
}

export async function fetchHandler(url, method = "get", dataVersion = null) {
    let headers = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': globalConfig.railcontentConfig.token,
    };
    if (dataVersion) headers['Data-Version'] = dataVersion;
    try {
        const response = await fetchAbsolute(url, {method, headers});
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

function fetchAbsolute(url, params) {
    if (globalConfig.railcontentConfig.baseUrl) {
        if (url.startsWith('/')) {
            return fetch(globalConfig.railcontentConfig.baseUrl + url, params)
        }
    }
    return fetch(url, params);
}