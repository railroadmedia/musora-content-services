/**
 * @module Config
 */

import './types.js'

/** @type {Config} */
export let globalConfig = {
  sanityConfig: {},
  railcontentConfig: {},
  sessionConfig: {},
  localStorage: null,
  isMA: false,
  localTimezoneString: null, // In format: America/Vancouver
  permissionsVersion: 'v2', // 'v1' or 'v2'
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
 * Automatically initializes award definitions with 24-hour cache in the background.
 *
 * @param {Config} config - Configuration object containing API settings.
 *
 * @example Web Application
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
 *     authToken: 'your-auth-token',
 *   },
 *   sessionConfig: {
 *     token: 'your-user-api-token',
 *     userId: 'current-user-id',
 *     authToken: 'your-auth-token',
 *   },
 *   baseUrl: 'https://web-staging-one.musora.com',
 *   localStorage: localStorage,
 *   isMA: false,
 *   permissionsVersion: 'v1', // Optional: 'v1' (default) or 'v2'
 * });
 *
 * @example React Native Application
 * import AsyncStorage from '@react-native-async-storage/async-storage'
 *
 * initializeService({
 *   sanityConfig: { ... },
 *   railcontentConfig: { ... },
 *   sessionConfig: { ... },
 *   baseUrl: 'https://web-staging-one.musora.com',
 *   localStorage: AsyncStorage,
 *   isMA: true,
 * });
 */
export function initializeService(config) {
  globalConfig.sanityConfig = config.sanityConfig
  globalConfig.railcontentConfig = config.railcontentConfig
  globalConfig.sessionConfig = config.sessionConfig || config.railcontentConfig
  globalConfig.baseUrl = config.baseUrl || config.railcontentConfig.baseUrl
  globalConfig.localStorage = config.localStorage
  globalConfig.isMA = config.isMA || false
  globalConfig.localTimezoneString = config.localTimezoneString || null
  globalConfig.permissionsVersion = config.permissionsVersion || 'v2'

  if (config.localStorage) {
    import('./awards/internal/award-definitions')
      .then(({ awardDefinitions }) => awardDefinitions.initialize())
      .catch(error => {
        console.error('Failed to initialize award definitions:', error)
      })
  }
}
