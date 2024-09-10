import {fetchUserContext} from "./railcontent";

const StorageKey = "userContext";
let userContext = null;
let cache = null;

export function init(localCache) {
    cache = localCache;
}

async function getUserContext(contextHash) {
    if (!contextHash) throw new Error('contextHash not provided.');
    if (!userContext) {
        tryLoadFromCache();
    }
    if (userContext) {
        clearContextIfHashInvalid(contextHash);
    }
    if (!userContext) {
        await fetchFromServer();
    }
    return userContext;
}

function clearContextIfHashInvalid(contextHash) {
    if (userContext.hash !== contextHash) {
        clearCache();
    }
}

function tryLoadFromCache() {
    let localData = cache.getItem(StorageKey);
    if (localData) {
        userContext = JSON.parse(localData);
    }
}

async function fetchFromServer() {
    let data = await fetchUserContext();
    userContext = JSON.parse(data);
    cache.setItem(StorageKey, data);
}


export async function fetchContentData(contextHash, contentId) {
    let userContext = await getUserContext(contextHash);
    return userContext.data[contentId];
}

export function clearCache() {
    userContext = null;
    cache.setItem(StorageKey, null);
}

export function testClearLocal() {
    userContext = null;
}