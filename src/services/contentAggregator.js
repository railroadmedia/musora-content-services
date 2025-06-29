import {
  getProgressStateByIds,
  getProgressPercentageByIds,
  getResumeTimeSecondsByIds,
  getNextLesson
} from "./contentProgress"
import { isContentLikedByIds } from "./contentLikes"
import { fetchLikeCount, fetchLastInteractedChild } from "./railcontent"



export async function addContextToContent(dataPromise, ...dataArgs)
{
  const lastArg = dataArgs[dataArgs.length - 1]
  const options = typeof lastArg === 'object' && !Array.isArray(lastArg) ? lastArg : {}

  const {
    dataField = null,
    addProgressPercentage = false,
    addIsLiked = false,
    addLikeCount = false,
    addProgressStatus = false,
    addResumeTimeSeconds = false,
    addLastInteractedChild = false,
    addNextLesson = false,
  } = options

  const dataParam = lastArg === options ? dataArgs.slice(0, -1) : dataArgs

  const data = await dataPromise(...dataParam)
  if(!data) return false

  let ids = []

  //get each of dataField's sub-object's id's
  if (dataField && data?.[dataField]) {
    ids = data[dataField].map(item => item?.id).filter(Boolean);
  } else if (Array.isArray(data)) {
    ids = data.map(item => item?.id).filter(Boolean);
  } else if (data?.id) {
    ids = [data.id]
  }

  if(ids.length === 0) return false

  const [progressPercentageData, progressStatusData, isLikedData, resumeTimeData, lastInteractedChildData] = await Promise.all([
    addProgressPercentage ? getProgressPercentageByIds(ids) : Promise.resolve(null),
    addProgressStatus ? getProgressStateByIds(ids) : Promise.resolve(null),
    addIsLiked ? isContentLikedByIds(ids) : Promise.resolve(null),
    addResumeTimeSeconds ? getResumeTimeSecondsByIds(ids) : Promise.resolve(null),
    addLastInteractedChild ? fetchLastInteractedChild(ids)  : Promise.resolve(null),
    //needs each id (ids) and each type  (types)
    addNextLesson ? getNextLesson1(ids) : Promise.resolve(null),
  ])
  console.log('ids', ids)
  console.log('lastInteractedChildData', lastInteractedChildData)
  const addContext = async (item) => ({
    ...item,
    ...(addProgressPercentage ? { progressPercentage: progressPercentageData?.[item.id] } : {}),
    ...(addProgressStatus ? { progressStatus: progressStatusData?.[item.id] } : {}),
    ...(addIsLiked ? { isLiked: isLikedData?.[item.id] } : {}),
    ...(addLikeCount && ids.length === 1 ? { likeCount: await fetchLikeCount(item.id) } : {}),
    ...(addResumeTimeSeconds ? { resumeTime: resumeTimeData?.[item.id] } : {}),
    ...(addLastInteractedChild ? { lastInteractedChild: lastInteractedChildData?.[item.id] } : {}),
  })
  if (dataField) {
    data[dataField] = Array.isArray(data[dataField])
        ? await Promise.all(data[dataField].map(addContext))
        : await addContext(data[dataField])
    return data
  } else {
    return Array.isArray(data)
        ? await Promise.all(data.map(addContext))
        : await addContext(data)
  }
}

