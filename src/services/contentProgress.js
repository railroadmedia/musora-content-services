import {
  fetchContentProgress,
  postContentCompleted,
  postContentReset,
  postRecordWatchSession,
} from './railcontent.js'
import { DataContext, ContentProgressVersionKey } from './dataContext.js'
import { fetchHierarchy } from './sanity.js'

const STATE_STARTED = 'started'
const STATE_COMPLETED = 'completed'
const DATA_KEY_STATUS = 's'
const DATA_KEY_PROGRESS = 'p'
const DATA_KEY_RESUME_TIME = 't'
const DATA_KEY_LAST_UPDATED_TIME = 'u'
export let dataContext = new DataContext(ContentProgressVersionKey, fetchContentProgress)

export async function getProgressPercentage(contentId) {
  let data = await dataContext.getData()
  return data[contentId]?.[DATA_KEY_PROGRESS] ?? 0
}

export async function getProgressPercentageByIds(contentIds) {
  const data = await dataContext.getData()
  let progress = {}

  contentIds?.forEach((id) => (progress[id] = data[id]?.[DATA_KEY_PROGRESS] ?? 0))

  return progress
}

export async function getProgressState(contentId) {
  let data = await dataContext.getData()
  return data[contentId]?.[DATA_KEY_STATUS] ?? ''
}

export async function getProgressStateByIds(contentIds) {
  const data = await dataContext.getData()
  let progress = {}

  contentIds?.forEach((id) => (progress[id] = data[id]?.[DATA_KEY_STATUS] ?? ''))

  return progress
}

export async function getAllStarted(limit = null) {
  const data = await dataContext.getData()
  let ids = Object.keys(data)
    .filter(function (key) {
      return data[parseInt(key)][DATA_KEY_STATUS] === STATE_STARTED
    })
    .map(function (key) {
      return parseInt(key)
    })
    .sort(function (a, b) {
      let v1 = data[a][DATA_KEY_LAST_UPDATED_TIME]
      let v2 = data[b][DATA_KEY_LAST_UPDATED_TIME]
      if (v1 > v2) return -1
      else if (v1 < v2) return 1
      return 0
    })
  if (limit) {
    ids = ids.slice(0, limit)
  }
  return ids
}

export async function getAllCompleted(limit = null) {
  const data = await dataContext.getData()
  let ids = Object.keys(data)
    .filter(function (key) {
      return data[parseInt(key)][DATA_KEY_STATUS] === STATE_COMPLETED
    })
    .map(function (key) {
      return parseInt(key)
    })
    .sort(function (a, b) {
      let v1 = data[a][DATA_KEY_LAST_UPDATED_TIME]
      let v2 = data[b][DATA_KEY_LAST_UPDATED_TIME]
      if (v1 > v2) return -1
      else if (v1 < v2) return 1
      return 0
    })
  if (limit) {
    ids = ids.slice(0, limit)
  }
  return ids
}

export async function getAllStartedOrCompleted(limit = null) {
  const data = await dataContext.getData()
  let ids = Object.keys(data)
    .filter(function (key) {
      return (
        data[parseInt(key)][DATA_KEY_STATUS] === STATE_STARTED ||
        data[parseInt(key)][DATA_KEY_STATUS] === STATE_COMPLETED
      )
    })
    .map(function (key) {
      return parseInt(key)
    })
    .sort(function (a, b) {
      let v1 = data[a][DATA_KEY_LAST_UPDATED_TIME]
      let v2 = data[b][DATA_KEY_LAST_UPDATED_TIME]
      if (v1 > v2) return -1
      else if (v1 < v2) return 1
      return 0
    })
  if (limit) {
    ids = ids.slice(0, limit)
  }
  return ids
}

export async function getResumeTimeSeconds(contentId) {
  let data = await dataContext.getData()
  return data[contentId]?.[DATA_KEY_RESUME_TIME] ?? 0
}

export async function assignmentStatusCompleted(assignmentId, parentContentId) {
  await dataContext.update(
    async function (localContext) {
      let hierarchy = await fetchHierarchy(parentContentId)
      completeStatusInLocalContext(localContext, assignmentId, hierarchy)
    },
    async function () {
      return postContentCompleted(assignmentId)
    }
  )
}

export async function contentStatusCompleted(contentId) {
  await dataContext.update(
    async function (localContext) {
      let hierarchy = await fetchHierarchy(contentId)
      completeStatusInLocalContext(localContext, contentId, hierarchy)
    },
    async function () {
      return postContentCompleted(contentId)
    }
  )
}

function saveContentProgress(localContext, contentId, progress, currentSeconds, hierarchy) {
  if (progress === 100) {
    completeStatusInLocalContext(localContext, contentId, hierarchy)
    return
  }

  let data = localContext.data[contentId] ?? {}
  const currentProgress = data[DATA_KEY_STATUS]
  if (!currentProgress || currentProgress !== STATE_COMPLETED) {
    data[DATA_KEY_PROGRESS] = progress
    data[DATA_KEY_STATUS] = STATE_STARTED
  }
  data[DATA_KEY_RESUME_TIME] = currentSeconds
  data[DATA_KEY_LAST_UPDATED_TIME] = Math.round(new Date().getTime() / 1000)
  localContext.data[contentId] = data

  bubbleProgress(hierarchy, contentId, localContext)
}

function completeStatusInLocalContext(localContext, contentId, hierarchy) {
  let data = localContext.data[contentId] ?? {}
  data[DATA_KEY_PROGRESS] = 100
  data[DATA_KEY_STATUS] = STATE_COMPLETED
  data[DATA_KEY_LAST_UPDATED_TIME] = Math.round(new Date().getTime() / 1000)
  localContext.data[contentId] = data

  if (!hierarchy) return
  let children = hierarchy.children[contentId] ?? []
  for (let i = 0; i < children.length; i++) {
    let childId = children[i]
    completeStatusInLocalContext(localContext, childId, hierarchy)
  }
  bubbleProgress(hierarchy, contentId, localContext)
}

function getChildrenToDepth(parentId, hierarchy, depth = 1) {
  let childIds = hierarchy.children[parentId] ?? []
  let allChildrenIds = childIds
  childIds.forEach((id) => {
    allChildrenIds = allChildrenIds.concat(getChildrenToDepth(id, hierarchy, depth - 1))
  })
  return allChildrenIds
}

export async function assignmentStatusReset(assignmentId, contentId) {
  await dataContext.update(
    async function (localContext) {
      let hierarchy = await fetchHierarchy(contentId)
      resetStatusInLocalContext(localContext, assignmentId, hierarchy)
    },
    async function () {
      return postContentReset(contentId)
    }
  )
}

export async function contentStatusReset(contentId) {
  await dataContext.update(
    async function (localContext) {
      let hierarchy = await fetchHierarchy(contentId)
      resetStatusInLocalContext(localContext, contentId, hierarchy)
    },
    async function () {
      return postContentReset(contentId)
    }
  )
}

function resetStatusInLocalContext(localContext, contentId, hierarchy) {
  let allChildIds = getChildrenToDepth(contentId, hierarchy, 5)
  allChildIds.push(contentId)
  allChildIds.forEach((id) => {
    const index = Object.keys(localContext.data).indexOf(id.toString())
    if (index > -1) {
      // only splice array when item is found
      delete localContext.data[id]
    }
  })
  bubbleProgress(hierarchy, contentId, localContext)
}

/**
 * Record watch session
 * @return {string} sessionId - provide in future calls to update progress
 * @param {int} contentId
 * @param {string} mediaType - options are video, assignment, practice
 * @param {string} mediaCategory - options are youtube, vimeo, soundslice, play-alongs
 * @param {int} mediaLengthSeconds
 * @param {int} currentSeconds
 * @param {int} secondsPlayed
 * @param {string} sessionId - This function records a sessionId to pass into future updates to progress on the same video
 */
export async function recordWatchSession(
  contentId,
  mediaType,
  mediaCategory,
  mediaLengthSeconds,
  currentSeconds,
  secondsPlayed,
  sessionId = null
) {
  let mediaTypeId = getMediaTypeId(mediaType, mediaCategory)
  let updateLocalProgress = mediaTypeId === 1 || mediaTypeId === 2 //only update for video playback
  if (!sessionId) {
    sessionId = uuidv4()
  }
  await dataContext.update(
    async function (localContext) {
      if (contentId && updateLocalProgress) {
        if (mediaLengthSeconds <= 0) {
          return
        }
        let progress = Math.min(
          99,
          Math.round(((currentSeconds ?? 0) / Math.max(1, mediaLengthSeconds ?? 0)) * 100)
        )
        let hierarchy = await fetchHierarchy(contentId)
        saveContentProgress(localContext, contentId, progress, currentSeconds, hierarchy)
      }
    },
    async function () {
      return postRecordWatchSession(
        contentId,
        mediaTypeId,
        mediaLengthSeconds,
        currentSeconds,
        secondsPlayed,
        sessionId
      )
    }
  )
  return sessionId
}

function getMediaTypeId(mediaType, mediaCategory) {
  switch (`${mediaType}_${mediaCategory}`) {
    case 'video_youtube':
      return 1
    case 'video_vimeo':
      return 2
    case 'assignment_soundslice':
      return 3
    case 'practice_play-alongs':
      return 4
    default:
      throw Error(`Unsupported media type: ${mediaType}_${mediaCategory}`)
  }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function bubbleProgress(hierarchy, contentId, localContext) {
  let parentId = hierarchy?.parents?.[contentId]
  if (!parentId) return
  let data = localContext.data[parentId] ?? {}
  let childProgress = hierarchy?.children?.[parentId]?.map(function (childId) {
    return localContext.data[childId]?.[DATA_KEY_PROGRESS] ?? 0
  })
  let progress = Math.round(childProgress.reduce((a, b) => a + b, 0) / childProgress.length)
  data[DATA_KEY_PROGRESS] = progress
  data[DATA_KEY_STATUS] = progress === 100 ? STATE_COMPLETED : STATE_STARTED
  localContext.data[parentId] = data
  bubbleProgress(hierarchy, parentId, localContext)
}
