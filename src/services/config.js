/**
 * @module Config
 */

/**
 * @typedef {Object} SanityConfig
 * @property {string} token - The API token for authenticating with Sanity.
 * @property {string} projectId - The project ID in Sanity.
 * @property {string} dataset - The dataset name in Sanity.
 * @property {string} version - The API version to use.
 * @property {boolean} [debug=false] - Optional flag to enable debug mode.
 * @property {boolean} [useCachedAPI=true] - Optional flag to enable or disable the use of the cached API.
 * @property {boolean} [useDummyRailContentMethods=false] - Optional flag to use test harness for railcontent methods. Should only be used by jest tests.
 */

/**
 * @typedef {Object} RailcontentConfig
 * @property {string} token - The token for authenticating user-specific requests.
 * @property {string} userId - The user ID for fetching user-specific data.
 * @property {string} baseUrl - The url for the environment.
 * @property {string} authToken - The bearer authorization token.
 */

/**
 * @typedef {Object} RecommendationsConfig
 * @property {string} token - The token for authenticating recommendation requests.
 * @property {string} baseUrl - The url for the recommendation server.
 */

/**
 * @typedef {Object} SessionConfig
 * @property {string} token - The token for authenticating user-specific requests.
 * @property {string} userId - The user ID for fetching user-specific data.
 * @property {string} authToken - The bearer authorization token.
 */

/**
 * @typedef {Object} Config
 * @property {SanityConfig} sanityConfig - Configuration for Sanity API.
 * @property {RailcontentConfig} railcontentConfig - [DEPRECATED] Configuration for user services.
 * @property {RecommendationsConfig} recommendationsConfig - Configuration for recommendation services.
 * @property {SessionConfig} sessionsConfig - Configuration for session management.
 * @property {Object} localStorage - Cache to use for localStorage
 * @property {boolean} isMA - Variable that tells if the library is used by MA or FEW
 * @property {string} localTimezoneString - The local timezone string in format: America/Vancouver
 * @property {string} baseUrl - The url for the environment.
 */

/** @type {Config} */
export let globalConfig = {
  sanityConfig: {},
  railcontentConfig: {},
  recommendationsConfig: {},
  sessionsConfig: {},
  localStorage: null,
  isMA: false,
  localTimezoneString: null, // In format: America/Vancouver
}

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

/**
 * Initializes the service with the given configuration.
 * This function must be called before using any other functions in this library.
 *
 * @param {Config} config - Configuration object containing API settings.
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
 *     useCachedAPI: false,
 *   },
 *   railcontentConfig: {
 *     token: 'your-user-api-token',
 *     userId: 'current-user-id',
 *     baseUrl: 'https://web-staging-one.musora.com',
 *     authToken 'your-auth-token',
 *   },
 *   sessionConfig: {
 *     token: 'your-user-api-token',
 *     userId: 'current-user-id',
 *     authToken 'your-auth-token',
 *   },
 *   recommendationsConfig: {
 *     token: 'your-user-api-token',
 *     baseUrl: 'https://MusoraProductDepartment-PWGenerator.hf.space',
 *   },
 *   baseUrl: 'https://web-staging-one.musora.com',
 *   localStorage: localStorage,
 *   isMA: false,
 * });
 */
export function initializeService(config) {
  globalConfig.sanityConfig = config.sanityConfig
  globalConfig.railcontentConfig = config.railcontentConfig
  globalConfig.sessionsConfig = config.sessionsConfig || config.railcontentConfig
  globalConfig.baseUrl = config.baseUrl || config.railcontentConfig.baseUrl
  globalConfig.localStorage = config.localStorage
  globalConfig.isMA = config.isMA || false
  globalConfig.localTimezoneString = config.localTimezoneString || null
  globalConfig.recommendationsConfig = config.recommendationsConfig
}
