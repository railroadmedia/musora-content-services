import { globalConfig } from '../services/config'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = ['wasLastUpdateOlderThanXSeconds', 'setLastUpdatedTime']

/**
 * Checks if the last update was older than X seconds.
 *
 * @param {number} seconds - The number of seconds to compare.
 * @param {string} key - The key to check the last updated time.
 *
 * @returns {boolean} - True if the last update was older than X seconds, false otherwise.
 */
export function wasLastUpdateOlderThanXSeconds(seconds, key) {
  let lastUpdated = globalConfig.localStorage.getItem(key)
  if (!lastUpdated) return false
  const verifyServerTime = seconds * 1000
  return new Date().getTime() - lastUpdated > verifyServerTime
}

/**
 * Sets the last updated time.
 *
 * @param {string} key - The key to set the last updated time.
 *
 * @returns {void}
 */
export function setLastUpdatedTime(key) {
  globalConfig.localStorage.setItem(key, new Date().getTime()?.toString())
}

/**
 * Clears the last updated time.
 *
 * @param {string} key - The key to clear the last updated time.
 *
 * @returns {void}
 */
export function clearLastUpdatedTime(key) {
  globalConfig.localStorage.removeItem(key)
}
