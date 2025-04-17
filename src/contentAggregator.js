import { getProgressStateByIds, getProgressPercentageByIds, getResumeTimeSecondsByIds } from "./services/contentProgress" 
import { isContentLikedByIds } from "./services/contentLikes"
import { fetchLikeCount } from "./services/railcontent"

export const addContextToContent = async (dataPromise, ...dataArgs) => {
  const lastArg = dataArgs[dataArgs.length - 1]
  const options = typeof lastArg === 'object' && !Array.isArray(lastArg) ? lastArg : {}

  const {
    addProgressPercentage = false,
    addIsLiked = false,
    addLikeCount = false,
    addStatus = false,
    addResumeTimeSeconds = false
  } = options

  const dataParam = lastArg === options ? dataArgs.slice(0, -1) : dataArgs;

  const data = await dataPromise(...dataParam)
  if(!data) return 'data'

  console.log('data', data)

  const ids = Array.isArray(data)
    ? data.map(item => item?.id).filter(Boolean)
    : [data?.id].filter(Boolean)

  if(ids.length === 0) return 'ids'

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
    ...(addLikeCount ? { likeCount: await fetchLikeCount(item.id) } : {}),
    ...(addResumeTimeSeconds ? { resumeTime: resumeTimeData?.[item.id] } : {}),
  })
  
  const newData = Array.isArray(data)
  ? await Promise.all(data.map(addContext))
  : await addContext(data)

  return newData
}

