import {
    fetchUserPermissionsData
} from "./railcontent";
import {setLastUpdatedTime, wasLastUpdateOlderThanXSeconds} from "./lastUpdated";

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = ['wasLastUpdateOlderThanXSeconds'];
let userPermissionsPromise = null;
let lastUpdatedKey = `userPermissions_lastUpdated`;

export async function fetchUserPermissions() {
    if (!userPermissionsPromise || wasLastUpdateOlderThanXSeconds(10, lastUpdatedKey)) {
        userPermissionsPromise = fetchUserPermissionsData();
        setLastUpdatedTime(lastUpdatedKey);
    }

    return await userPermissionsPromise;
}

export async function reset() {
    userPermissionsPromise = null;
}