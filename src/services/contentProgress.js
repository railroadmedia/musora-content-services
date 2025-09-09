import {
  fetchContentProgress,
  postContentComplete,
  postContentReset,
  postContentStartForGC,
  postRecordWatchSession,
} from './railcontent.js'
import { DataContext, ContentProgressVersionKey } from './dataContext.js'
import { fetchHierarchy } from './sanity.js'
import { recordUserPractice, findIncompleteLesson } from './userActivity'
import { getNextLessonLessonParentTypes } from '../contentTypeConfig.js'

const STATE_STARTED = 'started'
const STATE_COMPLETED = 'completed'
const DATA_KEY_STATUS = 's'
const DATA_KEY_PROGRESS = 'p'
const DATA_KEY_RESUME_TIME = 't'
const DATA_KEY_LAST_UPDATED_TIME = 'u'
const DATA_KEY_BRAND = 'b'

export let dataContext = new DataContext(ContentProgressVersionKey, fetchContentProgress)

let sessionData = []

export async function getProgressPercentage(contentId) {
  return getById(contentId, DATA_KEY_PROGRESS, 0)
}

export async function getProgressPercentageByIds(contentIds) {
  return getByIds(contentIds, DATA_KEY_PROGRESS, 0)
}

export async function getProgressState(contentId) {
  return getById(contentId, DATA_KEY_STATUS, '')
}

export async function getProgressStateByIds(contentIds) {
  return getByIds(contentIds, DATA_KEY_STATUS, '')
}

export async function getResumeTimeSeconds(contentId) {
  return getById(contentId, DATA_KEY_RESUME_TIME, 0)
}

export async function getResumeTimeSecondsByIds(contentIds) {
  return getByIds(contentIds, DATA_KEY_RESUME_TIME, 0)
}

export async function getNextLesson(data) {
  let nextLessonData = {}

  for (const content of data) {
    const children = content.children?.map((child) => child.id) ?? []
    //only calculate nextLesson if needed, based on content type
    if (!getNextLessonLessonParentTypes.includes(content.type)) {
      nextLessonData[content.id] = null
    } else {
      //return first child if parent-content is complete or no progress
      const contentState = await getProgressState(content.id)
      if (contentState !== STATE_STARTED) {
        nextLessonData[content.id] = children[0]
      } else {
        const childrenStates = await getProgressStateByIds(children)

        //calculate last_engaged
        const lastInteracted = await getLastInteractedOf(children)
        const lastInteractedStatus = childrenStates[lastInteracted]

        //different nextLesson behaviour for different content types
        if (content.type === 'course' || content.type === 'pack-bundle') {
          if (lastInteractedStatus === STATE_STARTED) {
            nextLessonData[content.id] = lastInteracted
          } else {
            nextLessonData[content.id] = findIncompleteLesson(
              childrenStates,
              lastInteracted,
              content.type
            )
          }
        } else if (content.type === 'guided-course' || content.type === 'song-tutorial') {
          nextLessonData[content.id] = findIncompleteLesson(
            childrenStates,
            lastInteracted,
            content.type
          )
        } else if (content.type === 'pack') {
          const packBundles = content.children ?? []
          const packBundleProgressData = await getNextLesson(packBundles)
          const parentId = await getLastInteractedOf(packBundles.map((bundle) => bundle.id))
          nextLessonData[content.id] = packBundleProgressData[parentId]
        }
      }
    }
  }
  return nextLessonData
}

export async function getNavigateTo(data) {
  let navigateToData = {}
  const twoDepthContentTypes = ['pack'] //TODO add method when we know what it's called
  //TODO add parent hierarchy upwards as well
  // data structure is the same but instead of child{} we use parent{}
  for (const content of data) {
    //only calculate nextLesson if needed, based on content type
    if (!getNextLessonLessonParentTypes.includes(content.type) || !content.children) {
      navigateToData[content.id] = null
    } else {
      const children = new Map()
      const childrenIds = []
      content.children.forEach((child) => {
        childrenIds.push(child.id)
        children.set(child.id, child)
      })
      // return first child (or grand child) if parent-content is complete or no progress
      const contentState = await getProgressState(content.id)
      if (contentState !== STATE_STARTED) {
        const firstChild = content.children[0]
        let lastInteractedChildNavToData =
          (await getNavigateTo([firstChild])[firstChild.id]) ?? null
        navigateToData[content.id] = buildNavigateTo(
          content.children[0],
          lastInteractedChildNavToData
        )
      } else {
        const childrenStates = await getProgressStateByIds(childrenIds)
        const lastInteracted = await getLastInteractedOf(childrenIds)
        const lastInteractedStatus = childrenStates[lastInteracted]

        if (content.type === 'course' || content.type === 'pack-bundle') {
          if (lastInteractedStatus === STATE_STARTED) {
            navigateToData[content.id] = buildNavigateTo(children.get(lastInteracted))
          } else {
            let incompleteChild = findIncompleteLesson(childrenStates, lastInteracted, content.type)
            navigateToData[content.id] = buildNavigateTo(children.get(incompleteChild))
          }
        } else if (content.type === 'guided-course' || content.type === 'song-tutorial') {
          let incompleteChild = findIncompleteLesson(childrenStates, lastInteracted, content.type)
          navigateToData[content.id] = buildNavigateTo(children.get(incompleteChild))
        } else if (twoDepthContentTypes.includes(content.type)) {
          const firstChildren = content.children ?? []
          const lastInteractedChildId = await getLastInteractedOf(
            firstChildren.map((child) => child.id)
          )
          if (childrenStates[lastInteractedChildId] === STATE_COMPLETED) {
            // TODO: packs have an extra situation where we need to jump to the next course if all lessons in the last engaged course are completed
          }
          let lastInteractedChildNavToData = await getNavigateTo(firstChildren)
          lastInteractedChildNavToData = lastInteractedChildNavToData[lastInteractedChildId]
          navigateToData[content.id] = buildNavigateTo(
            children.get(lastInteractedChildId),
            lastInteractedChildNavToData
          )
        }
      }
    }
  }
  return navigateToData
}

function buildNavigateTo(content, child = null) {
  if (!content) {
    return null
  }

  return {
    brand: content.brand ?? '',
    thumbnail: content.thumbnail ?? '',
    id: content.id ?? null,
    type: content.type ?? '',
    published_on: content.published_on ?? null,
    child: child,
  }
}

/**
 * filter through contents, only keeping the most recent
 * @param {array} contentIds
 * @returns {Promise<number>}
 */
export async function getLastInteractedOf(contentIds) {
  const data = await getByIds(contentIds, DATA_KEY_LAST_UPDATED_TIME, 0)
  const sorted = Object.keys(data)
    .map(function (key) {
      return parseInt(key)
    })
    .sort(function (a, b) {
      let v1 = data[a]
      let v2 = data[b]
      if (v1 > v2) return -1
      else if (v1 < v2) return 1
      return 0
    })

  return sorted[0]
}

export async function getProgressDateByIds(contentIds) {
  let data = await dataContext.getData()
  let progress = {}
  contentIds?.forEach(
    (id) =>
      (progress[id] = {
        last_update: data[id]?.[DATA_KEY_LAST_UPDATED_TIME] ?? 0,
        progress: data[id]?.[DATA_KEY_PROGRESS] ?? 0,
        status: data[id]?.[DATA_KEY_STATUS] ?? '',
      })
  )
  return progress
}

async function getById(contentId, dataKey, defaultValue) {
  let data = await dataContext.getData()
  return data[contentId]?.[dataKey] ?? defaultValue
}

async function getByIds(contentIds, dataKey, defaultValue) {
  let data = await dataContext.getData()
  let progress = {}
  contentIds?.forEach((id) => (progress[id] = data[id]?.[dataKey] ?? defaultValue))
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

export async function getAllStartedOrCompleted({
  limit = null,
  onlyIds = true,
  brand = null,
  excludedIds = [],
} = {}) {
  const data = await dataContext.getData()
  const oneMonthAgoInSeconds = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60 // 60 days in seconds

  const excludedSet = new Set(excludedIds.map((id) => parseInt(id))) // ensure IDs are numbers

  let filtered = Object.entries(data)
    .filter(([key, item]) => {
      const id = parseInt(key)
      const isRelevantStatus =
        item[DATA_KEY_STATUS] === STATE_STARTED || item[DATA_KEY_STATUS] === STATE_COMPLETED
      const isRecent = item[DATA_KEY_LAST_UPDATED_TIME] >= oneMonthAgoInSeconds
      const isCorrectBrand = !brand || !item.b || item.b === brand
      const isNotExcluded = !excludedSet.has(id)
      return isRelevantStatus && isCorrectBrand && isNotExcluded
    })
    .sort(([, a], [, b]) => {
      const v1 = a[DATA_KEY_LAST_UPDATED_TIME]
      const v2 = b[DATA_KEY_LAST_UPDATED_TIME]
      if (v1 > v2) return -1
      else if (v1 < v2) return 1
      return 0
    })

  if (limit) {
    filtered = filtered.slice(0, limit)
  }

  if (onlyIds) {
    return filtered.map(([key]) => parseInt(key))
  } else {
    const progress = {}
    filtered.forEach(([key, item]) => {
      const id = parseInt(key)
      progress[id] = {
        last_update: item?.[DATA_KEY_LAST_UPDATED_TIME] ?? 0,
        progress: item?.[DATA_KEY_PROGRESS] ?? 0,
        status: item?.[DATA_KEY_STATUS] ?? '',
        brand: item?.b ?? '',
      }
    })
    return progress
  }
}

/**
 * Simplified version of `getAllStartedOrCompleted`.
 *
 * Fetches content IDs and progress percentages for items that were
 * started or completed.
 *
 * @param {Object} [options={}] - Optional filtering options.
 * @param {string|null} [options.brand=null] - Brand to filter by (e.g., 'drumeo').
 * @returns {Promise<Object>} - A map of content ID to progress value:
 *   {
 *     [id]: progressPercentage
 *   }
 *
 * @example
 * const progressMap = await getStartedOrCompletedProgressOnly({ brand: 'drumeo' });
 * console.log(progressMap[123]); // => 52
 */
export async function getStartedOrCompletedProgressOnly({ brand = null } = {}) {
  const data = await dataContext.getData()
  const result = {}

  Object.entries(data).forEach(([key, item]) => {
    const id = parseInt(key)
    const isRelevantStatus =
      item[DATA_KEY_STATUS] === STATE_STARTED || item[DATA_KEY_STATUS] === STATE_COMPLETED
    const isCorrectBrand = !brand || item.b === brand

    if (isRelevantStatus && isCorrectBrand) {
      result[id] = item?.[DATA_KEY_PROGRESS] ?? 0
    }
  })

  return result
}

export async function contentStatusCompleted(contentId) {
  return await dataContext.update(
    async function (localContext) {
      let hierarchy = await fetchHierarchy(contentId)
      completeStatusInLocalContext(localContext, contentId, hierarchy)
    },
    async function () {
      return postContentComplete(contentId)
    }
  )
}
export async function contentStatusStartedForGuidedCourseEnrollment(contentId) {
  const response = await postContentStartForGC(contentId);

  return await dataContext.update(
    async function (localContext) {
      let hierarchy = await fetchHierarchy(contentId)
      startStatusInLocalContext(localContext, contentId, hierarchy)
    },
    async function () {
      return response
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

function startStatusInLocalContext(localContext, contentId, hierarchy) {
  let data = localContext.data[contentId] ?? {}
  data[DATA_KEY_PROGRESS] = 0
  data[DATA_KEY_STATUS] = STATE_STARTED
  data[DATA_KEY_LAST_UPDATED_TIME] = Math.round(new Date().getTime() / 1000)
  localContext.data[contentId] = data

  if (!hierarchy) return
  let children = hierarchy.children[contentId] ?? []
  for (let i = 0; i < children.length; i++) {
    let childId = children[i]
    startStatusInLocalContext(localContext, childId, hierarchy)
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
 * @param {int} instrumentId - enum value of instrument id
 * @param {int} categoryId - enum value of category id
 */
export async function recordWatchSession(
  contentId,
  mediaType,
  mediaCategory,
  mediaLengthSeconds,
  currentSeconds,
  secondsPlayed,
  sessionId = null,
  instrumentId = null,
  categoryId = null
) {
  let mediaTypeId = getMediaTypeId(mediaType, mediaCategory)
  let updateLocalProgress = mediaTypeId === 1 || mediaTypeId === 2 //only update for video playback
  if (!sessionId) {
    sessionId = uuidv4()
  }

  try {
    //TODO: Good enough for Alpha, Refine in reliability improvements
    sessionData[sessionId] = sessionData[sessionId] || {}
    const secondsSinceLastUpdate = Math.ceil(
      secondsPlayed - (sessionData[sessionId][contentId] ?? 0)
    )
    await recordUserPractice({
      content_id: contentId,
      duration_seconds: secondsSinceLastUpdate,
      instrument_id: instrumentId,
    })
  } catch (error) {
    console.error('Failed to record user practice:', error)
  }
  sessionData[sessionId][contentId] = secondsPlayed

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
    case 'video_soundslice':
      return 3
    default:
      return 5
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
  const brand = localContext.data[contentId]?.[DATA_KEY_BRAND] ?? null
  data[DATA_KEY_PROGRESS] = progress
  data[DATA_KEY_STATUS] = progress === 100 ? STATE_COMPLETED : STATE_STARTED
  data[DATA_KEY_LAST_UPDATED_TIME] = Math.round(new Date().getTime() / 1000)
  data[DATA_KEY_BRAND] = brand
  localContext.data[parentId] = data
  bubbleProgress(hierarchy, parentId, localContext)
}
