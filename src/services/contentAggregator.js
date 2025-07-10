import { getProgressStateByIds, getProgressPercentageByIds, getResumeTimeSecondsByIds } from "./contentProgress"
import { isContentLikedByIds } from "./contentLikes"
import { fetchLikeCount, fetchLastInteractedChild } from "./railcontent"



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
  } = options

  const dataParam = lastArg === options ? dataArgs.slice(0, -1) : dataArgs

  const data = await dataPromise(...dataParam)
  if(!data) return false

  let ids = []

  if (dataField && (data?.[dataField] || iterateDataFieldOnEachArrayElement)) {
    if (iterateDataFieldOnEachArrayElement && Array.isArray(data)) {
      for(const parent of data) {
        ids = [...ids, ...parent[dataField].map(item => item?.id).filter(Boolean)]
      }
    } else {
      ids = data[dataField].map(item => item?.id).filter(Boolean);
    }
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
  ])

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

