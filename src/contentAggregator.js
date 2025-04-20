import { getProgressStateByIds, getProgressPercentageByIds, getResumeTimeSecondsByIds } from "./services/contentProgress" 
import { isContentLikedByIds } from "./services/contentLikes"
import { fetchLikeCount } from "./services/railcontent"

export const addContextToContent = async (dataPromise, ...dataArgs) => {
  const lastArg = dataArgs[dataArgs.length - 1]
  const options = typeof lastArg === 'object' && !Array.isArray(lastArg) ? lastArg : {}

  const {
    dataField = null,
    addProgressPercentage = false,
    addIsLiked = false,
    addLikeCount = false,
    addStatus = false,
    addResumeTimeSeconds = false
  } = options

  const dataParam = lastArg === options ? dataArgs.slice(0, -1) : dataArgs

  const data = await dataPromise(...dataParam)
  if(!data) return false

  let ids = []

  if (dataField && data?.[dataField]) {
    ids = data[dataField].map(item => item?.id).filter(Boolean);
  } else if (Array.isArray(data)) {
    ids = data.map(item => item?.id).filter(Boolean);
  } else if (data?.id) {
    ids = [data.id]
  }

  if(ids.length === 0) return false

  const [progressPercentageData, statusData, isLikedData, resumeTimeData] = await Promise.all([
    addProgressPercentage ? getProgressPercentageByIds(ids) : Promise.resolve(null),
    addStatus ? getProgressStateByIds(ids) : Promise.resolve(null),
    addIsLiked ? isContentLikedByIds(ids) : Promise.resolve(null),
    addResumeTimeSeconds ? getResumeTimeSecondsByIds(ids) : Promise.resolve(null),
  ])

  const addContext = async (item) => ({
    ...item,
    ...(addProgressPercentage ? { progressPercentage: progressPercentageData?.[item.id] } : {}),
    ...(addStatus ? { progressStatus: statusData?.[item.id] } : {}),
    ...(addIsLiked ? { isLiked: isLikedData?.[item.id] } : {}),
    ...(addLikeCount && ids.length === 1 ? { likeCount: await fetchLikeCount(item.id) } : {}),
    ...(addResumeTimeSeconds ? { resumeTime: resumeTimeData?.[item.id] } : {}),
  })
  
  const newData = Array.isArray(data)
  ? await Promise.all(data.map(addContext))
  : await addContext(data)

  return newData
}

