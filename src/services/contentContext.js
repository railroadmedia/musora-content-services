import { getProgressStateByIds, getProgressPercentageByIds, getResumeTimeSecondsByIds } from "./contentProgress" 
import { isContentLikedByIds } from "./contentLikes"

export const addContextToContent = async (dataPromise, options = {}) => {
  const {
    addProgressPercentage = false,
    addIsLiked = false,
    addLikeCount = false,
    addStatus = false,
    getResumeTimeSeconds = false
  } = options

  const data = await dataPromise()
  const ids = data.map(item => item.id)

  const [progressPercentageData, statusData, isLikedData, resumeTimeData] = await Promise.all([
    addProgressPercentage ? getProgressPercentageByIds(ids) : Promise.resolve(null),
    addStatus ? getProgressStateByIds(ids) : Promise.resolve(null),
    addIsLiked ? isContentLikedByIds(ids) : Promise.resolve(null),
    getResumeTimeSeconds ? getResumeTimeSecondsByIds(ids) : Promise.resolve(null),
  ])


  const newData = data.map(item => ({
    ...item,
    ...(addProgressPercentage ? { progressPercentage: progressPercentageData[item.id] } : {}),
    ...(addStatus ? { status: statusData[item.id] } : {}),
    ...(addIsLiked ? { isLiked: isLikedData[item.id] } : {}),
    ...(addLikeCount ? { likeCount: item.like_count } : {}),
    ...(getResumeTimeSeconds ? { resumeTime: resumeTimeData[item.id] } : {}),
  }))

  return newData
}