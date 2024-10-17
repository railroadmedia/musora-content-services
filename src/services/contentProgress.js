import {
    fetchContentProgress,
    postContentCompleted,
    postContentReset,
    postContentStarted,
    postRecordWatchSession
} from "./railcontent";
import {DataContext, ContentProgressVersionKey} from "./dataContext";

const STATE_STARTED = 'started';
const STATE_COMPLETED = 'completed';
export let dataContext = new DataContext(ContentProgressVersionKey, fetchContentProgress());

export async function getProgressPercentage(contentId) {
    let data = await dataContext.getData();
    return data[contentId]?.['p'] ?? 0;
}

export async function getProgressState(contentId) {
    let data = await dataContext.getData();
    return data[contentId]?.['s'] ?? 0;
}

export async function getResumeTimeSeconds(contentId) {
    let data = await dataContext.getData();
    return data[contentId]?.['t'] ?? 0;
}

export async function contentStatusStarted(contentId) {
    await dataContext.update(
        function (context) {
            let data = context.data[contentId] ?? [];
            let progress = data?.['p'] ?? 0;
            let status = data?.['s'] ?? 0;

            if (status !== STATE_COMPLETED && progress !== 100) {
                status = STATE_STARTED;
            }

            data['s'] = status;
            context.data[contentId] = data;
        },
        async function () {
            return postContentStarted(contentId);
        });
}


export async function contentStatusCompleted(contentId) {
    await dataContext.update(
        function (context) {
            let data = context.data[contentId] ?? [];
            let status = data?.['s'] ?? 0;

            status = STATE_COMPLETED;

            data['s'] = status;
            context.data[contentId] = data;
        },
        async function () {
            return postContentCompleted(contentId);
        });
}

export async function contentStatusReset(contentId) {
    await dataContext.update(
        function (context) {
            const index = context.data.indexOf(contentId);
            if (index > -1) { // only splice array when item is found
                context.data.splice(index, 1); // 2nd parameter means remove one item only
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
        function (context) {
            if (contentId) {
                let data = context.data[contentId] ?? [];
                let progress = data?.['p'] ?? 0;
                let status = data?.['s'] ?? 0;

                if (status !== STATE_COMPLETED && progress !== 100) {
                    status = STATE_STARTED;
                    progress = Math.min(99, Math.round(watchPositionSeconds ?? 0 / Math.max(1, totalDurationSeconds ?? 0) * 100));
                }

                data['p'] = progress;
                data['s'] = status;
                data['t'] = watchPositionSeconds;
                context.data[contentId] = data;
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

