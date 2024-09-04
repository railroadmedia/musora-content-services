/**
 * @module Railcontent-Services
 */

const { globalConfig } = require('./config');


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
        const response = await fetch(url, { headers });
        const result = await response.json();

        if (result && result[content_id]) {            return result[content_id];  // Return the correct object
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
        const response = await fetch(url, { headers });
        const result = await response.json();
        if(result){
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
        const response = await fetch(url, { headers });
        const result = await response.json();
        if(result){
            console.log('fetchSongsInProgress', result);
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
 * @returns {Promise<Object|null>} - Returns an object containing in-progress content if found, otherwise null.
 * @example
 * fetchContentInProgress('song', 'drumeo')
 *   .then(songs => console.log(songs))
 *   .catch(error => console.error(error));
 */
export async function fetchContentInProgress(type="all", brand) {
    let url;
    if(type!=="all") {
        url = `/content/in_progress/${globalConfig.railcontentConfig.userId}?brand=${brand}`;
    } else {
        url = `/content/in_progress/${globalConfig.railcontentConfig.userId}?content_type=${type}&brand=${brand}`;
    }
    const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': globalConfig.railcontentConfig.token
    };
    try {
        const response = await fetch(url, { headers });
        const result = await response.json();
        if(result){
            console.log('contentInProgress', result);
            return result;
        } else {
            console.log('result not json');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}