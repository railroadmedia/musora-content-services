import {globalConfig} from "./config";

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = ['wasLastUpdateOlderThanXSeconds', 'setLastUpdatedTime'];
export function wasLastUpdateOlderThanXSeconds(seconds, key) {
    let lastUpdated = globalConfig.localStorage.getItem(key);
    if (!lastUpdated) return false;
    const verifyServerTime = seconds * 1000;
    return (new Date().getTime() - lastUpdated) > verifyServerTime;
}

export function setLastUpdatedTime(key) {
    globalConfig.localStorage.setItem(key, new Date().getTime()?.toString());
}
