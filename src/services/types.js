/**
 * @typedef {object} SanityConfig - Configuration for Sanity API.
 *
 * @property {string} token - The API token for authenticating with Sanity.
 * @property {string} projectId - The project ID in Sanity.
 * @property {string} dataset - The dataset name in Sanity.
 * @property {string} version - The API version to use.
 * @property {boolean} [debug=false] - Optional flag to enable debug mode.
 * @property {boolean} [useCachedAPI=true] - Optional flag to enable or disable the use of the cached API.
 * @property {boolean} [useDummyRailContentMethods=false] - Optional flag to use test harness for railcontent methods. Should only be used by jest tests.
 */

/**
 * @deprecated use `config.session` and `config.baseUrl` instead. Will be removed in future versions.
 *
 * @typedef {object} RailcontentConfig - Configuration for user services.
 *
 * @property {string} token - The token for authenticating user-specific requests.
 * @property {string} userId - The user ID for fetching user-specific data.
 * @property {string} authToken - The bearer authorization token.
 * @property {string} baseUrl - The url for the environment.
 */

/**
 * @typedef {object} SessionConfig - Configuration for user session.
 *
 * @property {string} token - The token for authenticating user-specific requests.
 * @property {string} userId - The user ID for fetching user-specific data.
 * @property {string} authToken - The bearer authorization token.
 */

/**
 * @typedef {object} RecommendationsConfig - Configuration for recommendation services.
 *
 * @property {string} token - The token for authenticating recommendation requests.
 * @property {string} baseUrl - The url for the recommendation server.
 */

/**
 * @typedef {object} Config
 *
 * @property {SanityConfig} sanityConfig
 * @property {RailcontentConfig} railcontentConfig - DEPRECATED use sessionConfig and baseUrl instead.
 * @property {SessionConfig} sessionConfig
 * @property {RecommendationsConfig} recommendationsConfig
 * @property {string} baseUrl - The url for the environment.
 * @property {Object} localStorage - Cache to use for localStorage
 * @property {boolean} isMA - Variable that tells if the library is used by MA or FEW
 * @property {string} localTimezoneString - The local timezone string in format: America/Vancouver
 */
