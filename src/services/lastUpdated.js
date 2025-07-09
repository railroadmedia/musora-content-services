import LocalCache from './local-cache/index.js'

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
  let lastUpdated = await new LocalCache().getItem(key)
  if (!lastUpdated) return false
  const verifyServerTime = seconds * 1000
  return new Date().getTime() - lastUpdated > verifyServerTime
}

export async function setLastUpdatedTime(key) {
  await new LocalCache().setItem(key, new Date().getTime()?.toString())
}

export async function clearLastUpdatedTime(key) {
  await new LocalCache().removeItem(key)
}
