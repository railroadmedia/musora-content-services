import {
  getLastInteractedOf,
  getNextLesson,
  getProgressPercentageByIds,
  getProgressStateByIds,
  getResumeTimeSecondsByIds
} from "./contentProgress"
import {isContentLikedByIds} from "./contentLikes"
import {fetchLastInteractedChild, fetchLikeCount} from "./railcontent"


export async function addContextToContent(dataPromise, ...dataArgs)
{
  const lastArg = dataArgs[dataArgs.length - 1]
  const options = typeof lastArg === 'object' && !Array.isArray(lastArg) ? lastArg : {}

  const {
    dataField = null,
    iterateDataFieldOnEachArrayElement = false,
    addProgressPercentage = false,
    addIsLiked = false,
    addLikeCount = false,
    addProgressStatus = false,
    addResumeTimeSeconds = false,
    addLastInteractedChild = false,
    addNextLesson = false,
    addLastInteractedParent = false,
  } = options

  const dataParam = lastArg === options ? dataArgs.slice(0, -1) : dataArgs

  const data = await dataPromise(...dataParam)
  if(!data) return false

  let items = []

  if (dataField && (data?.[dataField] || iterateDataFieldOnEachArrayElement)) {
    if (iterateDataFieldOnEachArrayElement && Array.isArray(data)) {
      for(const parent of data) {
        items = [...items, ...parent[dataField]]
      }
    } else {
      items = data[dataField]
    }
  } else if (Array.isArray(data)) {
    items = data;
  } else if (data?.id) {
    items = [data]
  }

  const ids = items.map(item => item?.id).filter(Boolean)

  if(ids.length === 0) return false

  const [progressPercentageData, progressStatusData, isLikedData, resumeTimeData, lastInteractedChildData, nextLessonData] = await Promise.all([
    addProgressPercentage ? getProgressPercentageByIds(ids) : Promise.resolve(null),
    addProgressStatus ? getProgressStateByIds(ids) : Promise.resolve(null),
    addIsLiked ? isContentLikedByIds(ids) : Promise.resolve(null),
    addResumeTimeSeconds ? getResumeTimeSecondsByIds(ids) : Promise.resolve(null),
    addLastInteractedChild ? fetchLastInteractedChild(ids)  : Promise.resolve(null),
    (addNextLesson || addLastInteractedParent) ? getNextLesson(items) : Promise.resolve(null),
  ])

  const addContext = async (item) => ({
    ...item,
    ...(addProgressPercentage ? { progressPercentage: progressPercentageData?.[item.id] } : {}),
    ...(addProgressStatus ? { progressStatus: progressStatusData?.[item.id] } : {}),
    ...(addIsLiked ? { isLiked: isLikedData?.[item.id] } : {}),
    ...(addLikeCount && ids.length === 1 ? { likeCount: await fetchLikeCount(item.id) } : {}),
    ...(addResumeTimeSeconds ? { resumeTime: resumeTimeData?.[item.id] } : {}),
    ...(addLastInteractedChild ? { lastInteractedChild: lastInteractedChildData?.[item.id] } : {}),
    ...(addNextLesson ? { nextLesson: nextLessonData?.[item.id] } : {}),
  })

  if (addLastInteractedParent) {
    const parentId = await getLastInteractedOf(ids);
    data['nextLesson'] = nextLessonData[parentId];
  }

  if (dataField) {
    if (iterateDataFieldOnEachArrayElement) {
      for(let parent of data) {
        parent[dataField] = Array.isArray(parent[dataField])
          ? await Promise.all(parent[dataField].map(addContext))
          : await addContext(parent[dataField])
      }
    } else {
      data[dataField] = Array.isArray(data[dataField])
        ? await Promise.all(data[dataField].map(addContext))
        : await addContext(data[dataField])
    }
    return data
  } else {
    return Array.isArray(data)
        ? await Promise.all(data.map(addContext))
        : await addContext(data)
  }
}

