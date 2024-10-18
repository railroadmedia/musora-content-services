import {
    fetchContentProgress,
    postContentCompleted,
    postContentReset,
    postContentStarted,
    postRecordWatchSession
} from "./railcontent";
import {DataContext, ContentProgressVersionKey} from "./dataContext";
import {fetchHierarchy, fetchParentByRailContentId} from "./sanity";

const STATE_STARTED = 'started';
const STATE_COMPLETED = 'completed';
const DATA_KEY_STATUS = 's';
const DATA_KEY_PROGRESS = 'p';
const DATA_KEY_RESUME_TIME = 't';
export let dataContext = new DataContext(ContentProgressVersionKey, fetchContentProgress());

export async function getProgressPercentage(contentId) {
    let data = await dataContext.getData();
    return data[contentId]?.[DATA_KEY_PROGRESS] ?? 0;
}

export async function getProgressState(contentId) {
    let data = await dataContext.getData();
    return data[contentId]?.[DATA_KEY_STATUS] ?? 0;
}

export async function getResumeTimeSeconds(contentId) {
    let data = await dataContext.getData();
    return data[contentId]?.[DATA_KEY_RESUME_TIME] ?? 0;
}

export async function contentStatusStarted(contentId) {
    await dataContext.update(
        function (localContext) {
            let data = localContext.data[contentId] ?? [];
            let progress = data?.[DATA_KEY_PROGRESS] ?? 0;
            let status = data?.[DATA_KEY_STATUS] ?? 0;

            if (status !== STATE_COMPLETED && progress !== 100) {
                status = STATE_STARTED;
            }

            data[DATA_KEY_STATUS] = status;
            localContext.data[contentId] = data;
        },
        async function () {
            return postContentStarted(contentId);
        });
}


export async function contentStatusCompleted(contentId) {
    await dataContext.update(
        function (localContext) {
            let data = localContext.data[contentId] ?? [];

            data[DATA_KEY_STATUS] = STATE_COMPLETED;
            localContext.data[contentId] = data;
        },
        async function () {
            return postContentCompleted(contentId);
        });
}

export async function contentStatusReset(contentId) {
    await dataContext.update(
        function (localContext) {
            const index = localContext.data.indexOf(contentId);
            if (index > -1) { // only splice array when item is found
                localContext.data.splice(index, 1); // 2nd parameter means remove one item only
            }
        },
        async function () {
            return postContentReset(contentId);
        });
}


export async function recordWatchSession({
                                             mediaId,
                                             mediaType,
                                             mediaCategory,
                                             watchPositionSeconds,
                                             totalDurationSeconds,
                                             sessionToken,
                                             brand,
                                             contentId = null
                                         }) {
    await dataContext.update(
        async function (localContext) {
            if (contentId) {
                let data = localContext.data[contentId] ?? [];
                let progress = data?.[DATA_KEY_PROGRESS] ?? 0;
                let status = data?.[DATA_KEY_STATUS] ?? 0;

                if (status !== STATE_COMPLETED && progress !== 100) {
                    status = STATE_STARTED;
                    progress = Math.min(99, Math.round(watchPositionSeconds ?? 0 / Math.max(1, totalDurationSeconds ?? 0) * 100));
                }

                data[DATA_KEY_PROGRESS] = progress;
                data[DATA_KEY_STATUS] = status;
                data[DATA_KEY_RESUME_TIME] = watchPositionSeconds;
                localContext.data[contentId] = data;

                let hierarchy = await fetchHierarchy(contentId);
                bubbleProgress(hierarchy, contentId, localContext);
            }
        },
        async function () {
            return postRecordWatchSession({
                mediaId,
                mediaType,
                mediaCategory,
                watchPositionSeconds,
                totalDurationSeconds,
                sessionToken,
                brand,
                contentId
            });
        }
    );
}

function bubbleProgress(hierarchy, contentId, localContext) {
    let parentId = hierarchy.parents[contentId];
    if (!parentId) return;
    let data = localContext.data[parentId] ?? [];
    let progress = data[DATA_KEY_PROGRESS];
    let status = data[DATA_KEY_STATUS];
    if (status !== STATE_COMPLETED && progress !== 100) {
        let childProgress = hierarchy.children[parentId].map(function (childId) {
            return localContext.data[childId]?.[DATA_KEY_PROGRESS] ?? 0;
        });
        progress = Math.round(childProgress.reduce((a, b) => a + b, 0) / childProgress.length);
        data[DATA_KEY_PROGRESS] = progress;
        localContext.data[parentId] = data;
    }
    bubbleProgress(hierarchy, parentId, localContext);
}

