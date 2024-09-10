/**
 * @module Config
 */

let globalConfig = {
    sanityConfig: {},
    railcontentConfig: {}
  };
  
/**
 * Initializes the service with the given configuration.
 * This function must be called before using any other functions in this library.
 *
 * @param {Object} config - Configuration object containing API settings.
 * @param {Object} config.sanityConfig - Configuration for Sanity API.
 * @param {string} config.sanityConfig.token - The API token for authenticating with Sanity.
 * @param {string} config.sanityConfig.projectId - The project ID in Sanity.
 * @param {string} config.sanityConfig.dataset - The dataset name in Sanity.
 * @param {string} config.sanityConfig.version - The API version to use.
 * @param {boolean} [config.sanityConfig.debug=false] - Optional flag to enable debug mode.
 * @param {boolean} [config.sanityConfig.useCachedAPI=true] - Optional flag to enable or disable the use of the cached API.
 * @param {Object} config.railcontentConfig - Configuration for user services.
 * @param {string} config.railcontentConfig.token - The token for authenticating user-specific requests.
 * @param {string} config.railcontentConfig.userId - The user ID for fetching user-specific data.
 * @param {string} config.railcontentConfig.baseUrl - The url for the enviroment.

 *
 * @example
 * // Initialize the service in your app.js
 * initializeService({
 *   sanityConfig: {
 *     token: 'your-sanity-api-token',
 *     projectId: 'your-sanity-project-id',
 *     dataset: 'your-dataset-name',
 *     version: '2021-06-07',
 *     debug: true,
 *     useCachedAPI: false
 *   },
 *   railcontentConfig: {
 *     token: 'your-user-api-token',
 *     userId: 'current-user-id',
 *     baseUrl: 'https://web-staging-one.musora.com'
 *   }
 * });
 */
function initializeService(config) {
    globalConfig.sanityConfig = config.sanityConfig;
    globalConfig.railcontentConfig = config.railcontentConfig;
}

// Export both the initialization function and the config object
module.exports = {
    initializeService,
    globalConfig
};
