import {fetchUserLikes, postContentLiked, postContentUnliked} from "./railcontent";
import {DataContext, ContentVersionKey} from "./dataContext";

export let dataContext = new DataContext(ContentVersionKey, fetchUserLikes);

export async function isContentLiked(contentId) {
    let data = await dataContext.getData();
    return data.includes(contentId);
}

export async function likeContent(contentId) {
   await dataContext.update(
        function (context) {
            if (!context.data.includes(contentId)) {
                context.data.push(contentId);
            }
        },
        async function(){
            return postContentLiked(contentId);
        }
    );
}

export async function unlikeContent(contentId) {
    await dataContext.update(
        function (context) {
            if (context.data.includes(contentId)) {
                const index = context.data.indexOf(contentId);
                if (index > -1) { // only splice array when item is found
                   context.data.splice(index, 1); // 2nd parameter means remove one item only
                }
            }
        },
        async function(){
            return postContentUnliked(contentId);
        }
    );
}