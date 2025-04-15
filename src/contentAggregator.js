import { getProgressStateByIds, getProgressPercentageByIds, getResumeTimeSecondsByIds } from "./services/contentProgress" 
import { isContentLikedByIds } from "./services/contentLikes"

export const addContextToContent = async (dataPromise, dataParam, options = {}) => {
  const {
    addProgressPercentage = false,
    addIsLiked = false,
    addLikeCount = false,
    addStatus = false,
    addResumeTimeSeconds = false
  } = options

  const data = await dataPromise(dataParam)
  const ids = data.map(item => item.id)

  const [progressPercentageData, statusData, isLikedData, resumeTimeData] = await Promise.all([
    addProgressPercentage ? getProgressPercentageByIds(ids) : Promise.resolve(null),
    addStatus ? getProgressStateByIds(ids) : Promise.resolve(null),
    addIsLiked ? isContentLikedByIds(ids) : Promise.resolve(null),
    addResumeTimeSeconds ? getResumeTimeSecondsByIds(ids) : Promise.resolve(null),
  ])


  const newData = data.map(item => ({
    ...item,
    ...(addProgressPercentage ? { progressPercentage: progressPercentageData[item.id] } : {}),
    ...(addStatus ? { status: statusData[item.id] } : {}),
    ...(addIsLiked ? { isLiked: isLikedData[item.id] } : {}),
    ...(addLikeCount ? { likeCount: item.like_count } : {}),
    ...(addResumeTimeSeconds ? { resumeTime: resumeTimeData[item.id] } : {}),
  }))

  return newData
}