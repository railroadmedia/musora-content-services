import {fetchUserLikes, postContentLiked, postContentUnliked} from "./railcontent";
import {DataContext, ContentLikesVersionKey} from "./dataContext";

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = [];

export let dataContext = new DataContext(ContentLikesVersionKey, fetchUserLikes);

export async function isContentLiked(contentId) {
    contentId = parseInt(contentId);
    let data = await dataContext.getData();
    return data.includes(contentId);
}

export async function likeContent(contentId) {
    contentId = parseInt(contentId);
    await dataContext.update(
        function (localContext) {
            if (!localContext.data.includes(contentId)) {
                localContext.data.push(contentId);
            }
        },
        async function () {
            return postContentLiked(contentId);
        }
    );
}

export async function unlikeContent(contentId) {
    contentId = parseInt(contentId);
    await dataContext.update(
        function (localContext) {
            if (localContext.data.includes(contentId)) {
                const index = localContext.data.indexOf(contentId);
                if (index > -1) { // only splice array when item is found
                    localContext.data.splice(index, 1); // 2nd parameter means remove one item only
                }
            }
        },
        async function () {
            return postContentUnliked(contentId);
        }
    );
}