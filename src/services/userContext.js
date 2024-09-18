import {fetchUserContext, fetchLikeContent, fetchUnlikeContent} from "./railcontent";

const StorageKey = "userContext";
let userContext = null;
let cache = null;

export function init(localCache) {
    cache = localCache;
}

export function version() {
    ensureLocalContextLoaded();
    return userContext.version;
}

async function getUserContext() {
    ensureLocalContextLoaded();
    if (userContext) {
        verifyContextIsValid();
    }
    if (!userContext) {
        await fetchFromServer();
    }
    return userContext;
}

function verifyContextIsValid() {

}

function ensureLocalContextLoaded() {
    if (userContext) return;
    let localData = cache.getItem(StorageKey);
    if (localData) {
        userContext = JSON.parse(localData);
    }
}

function updateLocalContext(contentId, updateFunction) {
    ensureLocalContextLoaded();
    if (userContext) {
        let contentData = userContext.data[contentId] ?? [];
        updateFunction(contentData);
        userContext.data[contentId] = contentData;
        userContext.version++;
        let data = JSON.stringify(userContext);
        cache.setItem(StorageKey, data);
    }
}

async function fetchFromServer() {
    let data = await fetchUserContext();
    userContext = JSON.parse(data);
    cache.setItem(StorageKey, data);
}


function transformData(data, contentId) {
    let transformed = [];
    transformed["contentId"] = contentId;
    transformed["liked"] = (data && data.l) ?? 0;
    return transformed;
}

export async function fetchContentData(contentId) {
    let userContext = await getUserContext();
    let data = userContext.data[contentId];
    data = transformData(data, contentId);
    return data;
}

export function clearCache() {
    userContext = null;
    cache.setItem(StorageKey, null);
}

export function testClearLocal() {
    userContext = null;
}

export async function likeContent(contentId) {
    updateLocalContext(contentId,
        function (contentData) {
            contentData.l = 1;
        }
    );

    let result = await fetchLikeContent(contentId);
    if (result.version !== userContext.version) {
        clearCache();
    }
}

export async function unlikeContent(contentId) {
    updateLocalContext(contentId,
        function (contentData) {
            contentData.l = 0;
        }
    );

    let result = await fetchUnlikeContent(contentId);
    if (result.version !== userContext.version) {
        clearCache();
    }
}