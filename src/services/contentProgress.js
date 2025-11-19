import {
  fetchContentProgress,
  postContentComplete,
  postContentReset,
  postContentStart,
  postRecordWatchSession,
} from './railcontent.js'
import { DataContext, ContentProgressVersionKey } from './dataContext.js'
import {
  fetchHierarchy,
  fetchMethodV2StructureFromId
} from './sanity.js'
import { recordUserPractice, findIncompleteLesson } from './userActivity'
import { getNextLessonLessonParentTypes } from '../contentTypeConfig.js'

const STATE_STARTED = 'started'
const STATE_COMPLETED = 'completed'
const DATA_KEY_STATUS = 's'
const DATA_KEY_PROGRESS = 'p'
const DATA_KEY_RESUME_TIME = 't'
const DATA_KEY_LAST_UPDATED_TIME = 'u'
const DATA_KEY_BRAND = 'b'
const DATA_KEY_COLLECTION = 'c'

export let dataContext = new DataContext(ContentProgressVersionKey, fetchContentProgress)

let sessionData = []

export async function getProgressPercentage(contentId, collection = null) {
  return getById(contentId, collection, DATA_KEY_PROGRESS, 0)
}

export async function getProgressPercentageByIds(contentIds, collection = null) {
  return getByIds(contentIds, collection, DATA_KEY_PROGRESS, 0)
}

export async function getProgressState(contentId, collection = null) {
  return getById(contentId, collection, DATA_KEY_STATUS, '')
}

export async function getProgressStateByIds(contentIds, collection = null) {
  return getByIds(contentIds, collection, DATA_KEY_STATUS, '')
}

export async function getResumeTimeSeconds(contentId, collection = null) {
  return getById(contentId, collection, DATA_KEY_RESUME_TIME, 0)
}

export async function getResumeTimeSecondsByIds(contentIds, collection = null) {
  return getByIds(contentIds, collection, DATA_KEY_RESUME_TIME, 0)
}

export async function getNavigateTo(data, collection = null) {
  let navigateToData = {}

  const twoDepthContentTypes = ['pack'] // not adding method because it has its own logic (with active path)
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
      const contentState = await getProgressState(content.id, collection)
      if (contentState !== STATE_STARTED) {
        const firstChild = content.children[0]
        let lastInteractedChildNavToData = await getNavigateTo([firstChild])
        lastInteractedChildNavToData = lastInteractedChildNavToData[firstChild.id] ?? null
        navigateToData[content.id] = buildNavigateTo(firstChild, lastInteractedChildNavToData, collection) //no G-child for LP
      } else {
        const childrenStates = await getProgressStateByIds(childrenIds, collection)
        const lastInteracted = await getLastInteractedOf(childrenIds, collection)
        const lastInteractedStatus = childrenStates[lastInteracted]

        if (['course', 'pack-bundle', 'skill-pack'].includes(content.type)) {
          if (lastInteractedStatus === STATE_STARTED) { // send to last interacted
            navigateToData[content.id] = buildNavigateTo(children.get(lastInteracted), null, collection)
          } else { // send to first incomplete after last interacted
            let incompleteChild = findIncompleteLesson(childrenStates, lastInteracted, content.type)
            navigateToData[content.id] = buildNavigateTo(children.get(incompleteChild), null, collection)
          }
        } else if (['song-tutorial', 'guided-course', 'learning-path-v2'].includes(content.type)) { // send to first incomplete
          let incompleteChild = findIncompleteLesson(childrenStates, lastInteracted, content.type)
          navigateToData[content.id] = buildNavigateTo(children.get(incompleteChild), null, collection)
        } else if (twoDepthContentTypes.includes(content.type)) { // send to navigateTo child of last interacted child
          const firstChildren = content.children ?? []
          const lastInteractedChildId = await getLastInteractedOf(
            firstChildren.map((child) => child.id),
            collection
          )
          if (childrenStates[lastInteractedChildId] === STATE_COMPLETED) {
            // TODO: packs have an extra situation where we need to jump to the next course if all lessons in the last engaged course are completed
          }
          let lastInteractedChildNavToData = await getNavigateTo(firstChildren)
          lastInteractedChildNavToData = lastInteractedChildNavToData[lastInteractedChildId]
          navigateToData[content.id] = buildNavigateTo(
            children.get(lastInteractedChildId),
            lastInteractedChildNavToData,
            collection
          )
        }
      }
    }
  }
  return navigateToData
}

function buildNavigateTo(content, child = null, collection = null) {
  if (!content) {
    return null
  }

  return {
    brand: content.brand ?? '',
    thumbnail: content.thumbnail ?? '',
    id: content.id ?? null,
    type: content.type ?? '',
    published_on: content.published_on ?? null,
    status: content.status ?? '',
    child: child,
    collection: collection,
  }
}

/**
 * filter through contents, only keeping the most recent
 * @param {array} contentIds
 * @param {object|null} collection
 * @returns {Promise<number>}
 */
export async function getLastInteractedOf(contentIds, collection = null) {
  const data = await getByIds(contentIds, collection, DATA_KEY_LAST_UPDATED_TIME, 0)
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

export async function getProgressDateByIds(contentIds, collection = null) {
  let data = await dataContext.getData()
  let progress = {}
  contentIds?.forEach((id) => {
    const key = generateRecordKey(id, collection)
    progress[id] = {
      last_update: data[key]?.[DATA_KEY_LAST_UPDATED_TIME] ?? 0,
      progress: data[key]?.[DATA_KEY_PROGRESS] ?? 0,
      status: data[key]?.[DATA_KEY_STATUS] ?? '',
    }
  })
  return progress
}

async function getById(contentId, collection, dataKey, defaultValue) {
  let data = await dataContext.getData()
  const contentKey = generateRecordKey(contentId, collection)
  return data[contentKey]?.[dataKey] ?? defaultValue
}

async function getByIds(contentIds, collection, dataKey, defaultValue) {
  let data = await dataContext.getData()
  let progress = {}
  contentIds?.forEach((id) => (progress[id] = data[generateRecordKey(id, collection)]?.[dataKey] ?? defaultValue))
  return progress
}

export async function getAllStarted(limit = null, collection = null) {
  const data = await dataContext.getData()

  let ids = Object.keys(data)
    .filter(function (id) {
      const key = generateRecordKey(id, collection)
      return data[key][DATA_KEY_STATUS] === STATE_STARTED
    })
    .map(function (id) {
      return parseInt(id)
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

export async function getAllCompleted(limit = null, collection = null) {
  const data = await dataContext.getData()

  let ids = Object.keys(data)
    .filter(function (id) {
      const key = generateRecordKey(id, collection)
      return data[key][DATA_KEY_STATUS] === STATE_COMPLETED
    })
    .map(function (id) {
      return parseInt(id)
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
  collection = null,
} = {}) {
  const data = await dataContext.getData()
  const oneMonthAgoInSeconds = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60 // 60 days in seconds

  const excludedSet = new Set(excludedIds.map((id) => parseInt(id))) // ensure IDs are numbers

  let filtered = Object.entries(data)
    .filter(([key, item]) => {
      const isRelevantStatus =
        item[DATA_KEY_STATUS] === STATE_STARTED || item[DATA_KEY_STATUS] === STATE_COMPLETED
      const isRecent = item[DATA_KEY_LAST_UPDATED_TIME] >= oneMonthAgoInSeconds
      const isCorrectBrand = !brand || !item.b || item.b === brand
      const isNotExcluded = !excludedSet.has(id)
      const matchesCollection =
        (!collection && !item[DATA_KEY_COLLECTION]) ||
        (item[DATA_KEY_COLLECTION].type === collection.type &&
          item[DATA_KEY_COLLECTION].id === collection.id)
      return matchesCollection && isRelevantStatus && isCorrectBrand && isNotExcluded
    })
    .sort(([, a], [, b]) => {
      const v1 = a[DATA_KEY_LAST_UPDATED_TIME]
      const v2 = b[DATA_KEY_LAST_UPDATED_TIME]
      if (v1 > v2) return -1
      else if (v1 < v2) return 1
      return 0
    })
    //maps to content_id
    .reduce((acc, [key, item]) => {
      const newKey = extractContentIdFromRecordKey(key)
      acc[newKey] = item
      return acc
    }, {})

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
export async function getStartedOrCompletedProgressOnly({
  brand = null,
  collection = null
} = {}) {
  const data = await dataContext.getData()
  const result = {}

  Object.entries(data).forEach(([key, item]) => {

    const id = extractContentIdFromRecordKey(key)
    const isRelevantStatus =
      item[DATA_KEY_STATUS] === STATE_STARTED || item[DATA_KEY_STATUS] === STATE_COMPLETED
    const isCorrectBrand = !brand || item.b === brand
    const matchesCollection =
      (!collection && !item[DATA_KEY_COLLECTION]) ||
      (item[DATA_KEY_COLLECTION].type === collection.type &&
        item[DATA_KEY_COLLECTION].id === collection.id)

    if (matchesCollection && isRelevantStatus && isCorrectBrand) {
      result[id] = item?.[DATA_KEY_PROGRESS] ?? 0
    }
  })

  return result
}

export async function contentStatusCompleted(contentId, collection = null) {
  return await dataContext.update(
    async function (localContext) {
      let hierarchy = await getContentHierarchy(contentId, collection)
      completeStatusInLocalContext(localContext, contentId, hierarchy, collection)
    },
    async function () {
      return postContentComplete(contentId, collection)
    }
  )
}
export async function contentStatusStarted(contentId, collection = null) {
  return await dataContext.update(
    async function (localContext) {
      let hierarchy = await getContentHierarchy(contentId, collection)
      startStatusInLocalContext(localContext, contentId, hierarchy, collection)
    },
    async function () {
      return postContentStart(contentId, collection)
    }
  )
}

function saveContentProgress(localContext, contentId, progress, currentSeconds, hierarchy, collection = null) {
  if (progress === 100) {
    completeStatusInLocalContext(localContext, contentId, hierarchy, collection)
    return
  }

  const key = generateRecordKey(contentId, collection)
  let data = localContext.data[key] ?? {}
  const currentProgress = data[DATA_KEY_STATUS]
  if (!currentProgress || currentProgress !== STATE_COMPLETED) {
    data[DATA_KEY_PROGRESS] = progress
    data[DATA_KEY_STATUS] = STATE_STARTED
  }
  data[DATA_KEY_RESUME_TIME] = currentSeconds
  data[DATA_KEY_LAST_UPDATED_TIME] = Math.round(new Date().getTime() / 1000)
  localContext.data[key] = data

  bubbleProgress(hierarchy, contentId, localContext)
}

function completeStatusInLocalContext(localContext, contentId, hierarchy, collection = null) {
  setStartedOrCompletedStatusInLocalContext(localContext, contentId, true, hierarchy, collection)
}

function startStatusInLocalContext(localContext, contentId, hierarchy, collection = null) {
  setStartedOrCompletedStatusInLocalContext(localContext, contentId, false, hierarchy, collection)
}

function setStartedOrCompletedStatusInLocalContext(
  localContext,
  contentId,
  isCompleted,
  hierarchy,
  collection = null
) {
  const key = generateRecordKey(contentId, collection)
  let data = localContext.data[key] ?? {}
  data[DATA_KEY_PROGRESS] = isCompleted ? 100 : 0
  data[DATA_KEY_STATUS] = isCompleted ? STATE_COMPLETED : STATE_STARTED
  data[DATA_KEY_LAST_UPDATED_TIME] = Math.round(new Date().getTime() / 1000)
  localContext.data[key] = data

  if (!hierarchy) return

  if (collection.type === 'learning-path') {
    bubbleOrTrickleLearningPathProgress(hierarchy, contentId, localContext, isCompleted, collection)
    return
  }

  let children = hierarchy.children[contentId] ?? []
  for (let i = 0; i < children.length; i++) {
    let childId = children[i]
    setStartedOrCompletedStatusInLocalContext(localContext, childId, isCompleted, hierarchy)
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

export async function contentStatusReset(contentId, collection = null) {
  await dataContext.update(
    async function (localContext) {
      let hierarchy = await getContentHierarchy(contentId, collection)
      resetStatusInLocalContext(localContext, contentId, hierarchy, collection)
    },
    async function () {
      return postContentReset(contentId)
    }
  )
}

function resetStatusInLocalContext(localContext, contentId, hierarchy, collection = null) {
  let keys = []

  keys.push(generateRecordKey(contentId, collection))

  let allChildIds
  let parentId = null
  let childrenIds = []
  if (collection && collection.type === 'learning-path' && hierarchy) {
    [parentId, childrenIds] = findLearningPathParentAndChildren(hierarchy, contentId)
    allChildIds = childrenIds
  } else {
    allChildIds = getChildrenToDepth(contentId, hierarchy, 5)
  }

  allChildIds.forEach((id) => {
    keys.push(generateRecordKey(id, collection))
  })

  keys.forEach((key) => {
    const index = Object.keys(localContext.data).indexOf(key.toString())
    if (index > -1) {
      // only splice array when item is found
      delete localContext.data[key]
    }
  })

  if (collection && collection.type === 'learning-path' && hierarchy) {
    resetStatusInLocalContext(localContext, parentId, null, collection)
  } else {
    bubbleProgress(hierarchy, contentId, localContext)
  }
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
 * @param {object|null} collection - optional collection info { type: 'learning-path', id: 123 }
 */
// NOTE: have not set up collection because its not super important for testing and this will change soon with watermelon
export async function recordWatchSession(
  contentId,
  mediaType,
  mediaCategory,
  mediaLengthSeconds,
  currentSeconds,
  secondsPlayed,
  sessionId = null,
  instrumentId = null,
  categoryId = null,
  collection = null
) {
  if (collection && collection.type === 'learning-path') {
    console.log('Learning Path lesson watch sessions are not set up yet without watermelon')
    return sessionId
  }

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

function generateRecordKey(contentId, collection) {
  return collection ? `${contentId}_${collection.type}_${collection.id}` : contentId
}

function extractContentIdFromRecordKey(key) {
  return key.split(':')[0]
}

async function getContentHierarchy(contentId, collection = null) {
  if (collection && collection.type === 'learning-path') {
    return fetchMethodV2StructureFromId(contentId)
  }
  return await fetchHierarchy(contentId)
}

function findLearningPathParentAndChildren(data, contentId) {
  let parentId = null
  let children = []

  if (!data.learningPaths) return { parentId, children }

  for (const lp of data.learningPaths) {
    if (lp.id === contentId) {
      parentId = null
      children = lp.children ?? []
      break
    }
    if (Array.isArray(lp.children) && lp.children.includes(contentId)) {
      parentId = lp.id
      children = []
      break
    }
  }

  return [parentId, children]
}

function bubbleOrTrickleLearningPathProgress(hierarchy, contentId, localContext, isCompleted, collection) {
  const [parentId, childrenIds] = findLearningPathParentAndChildren(hierarchy, contentId)

  if (parentId) {
    setStartedOrCompletedStatusInLocalContext(localContext, parentId, isCompleted, null, collection)
    return
  }

  if (childrenIds) {
    for (let i = 0; i < childrenIds.length; i++) {
      let childId = childrenIds[i]
      setStartedOrCompletedStatusInLocalContext(localContext, childId, isCompleted, null, collection)
    }
  }
}
