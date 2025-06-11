import { globalConfig } from './config.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = [
  'wasLastUpdateOlderThanXSeconds',
  'setLastUpdatedTime',
  'clearLastUpdatedTime',
]

export async function wasLastUpdateOlderThanXSeconds(seconds, key) {
  let lastUpdated = globalConfig.isMA
    ? await globalConfig.localStorage.getItem(key)
    : globalConfig.localStorage.getItem(key)
  if (!lastUpdated) return false
  const verifyServerTime = seconds * 1000
  return new Date().getTime() - lastUpdated > verifyServerTime
}

export function setLastUpdatedTime(key) {
  globalConfig.localStorage.setItem(key, new Date().getTime()?.toString())
}

export function clearLastUpdatedTime(key) {
  globalConfig.localStorage.removeItem(key)
}
