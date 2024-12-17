import {
    fetchUserPermissionsData
} from "./railcontent";
import {setLastUpdatedTime, wasLastUpdateOlderThanXSeconds} from "./lastUpdated";
import {globalConfig} from "./config";

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = [];
let userPermissionsPromise = null;
let lastUpdatedKey = `userPermissions_lastUpdated`;

export async function fetchUserPermissions() {
    const userId = globalConfig.railcontentConfig?.userId ?? 0;
    const key = `${lastUpdatedKey}_${userId}`;
    if (!userPermissionsPromise || wasLastUpdateOlderThanXSeconds(10, key)) {
        userPermissionsPromise = fetchUserPermissionsData();
        setLastUpdatedTime(key);
    }

    return await userPermissionsPromise;
}

export async function reset() {
    userPermissionsPromise = null;
}