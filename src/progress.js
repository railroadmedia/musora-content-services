let globalConfig = {};

/**
 * Initializes the service with the given configuration.
 * This function must be called before using any other functions in this module.
 *
 * @param {Object} config - Configuration object containing Musora API settings.
 * @param {string} config.token - The authentication token for musora web platform.
 * @param {string} [config.baseURL=''] - Optional base url for musora web platform.  If not provided uses relative paths.
 * @param {boolean} [config.debug=false] - Optional flag to enable debug mode, which logs the query and results.
 */
function initializeProgressModule(config) {
    globalConfig = config;
}

async function fetchSongsInProgress(userId, brand) {

    const url = `${globalConfig.baseURL}/content/in_progress/${userId}?content_type=song&brand=${brand}`;

    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${globalConfig.token}`,
        Accept: 'application/json',
    };
    console.log(headers);
    try {
        const response = await fetch(url, {headers});
        console.log(response);
        const result = await response.json();
        if (result) {
            console.log('fetchSongsInProgress', result);
            return result;
        } else {
            console.log('result not json')
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}


module.exports = {
    initializeProgressModule,
    fetchSongsInProgress
}