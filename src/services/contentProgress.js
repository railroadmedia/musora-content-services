import {
  fetchContentProgress,
  postContentComplete,
  postContentReset,
  postContentStart,
  postRecordWatchSession,
} from './railcontent.js'
import { DataContext, ContentProgressVersionKey } from './dataContext.js'
import { fetchHierarchy } from './sanity.js'
import { db } from './sync'
import { STATE } from './sync/models/ContentProgress'
import { recordUserPractice, findIncompleteLesson } from './userActivity'
import { getNextLessonLessonParentTypes } from '../contentTypeConfig.js'

const STATE_STARTED = STATE.STARTED
const STATE_COMPLETED = STATE.COMPLETED

// const DATA_KEY_STATUS = 's'
// const DATA_KEY_RESUME_TIME = 't'
// const DATA_KEY_LAST_UPDATED_TIME = 'u'

let sessionData = []

export async function getProgressState(contentId) {
  return getById(contentId, 'state', '')
}

export async function getProgressStateByIds(contentIds) {
  return getByIds(contentIds, 'state', '')
}

export async function getResumeTimeSecondsByIds(contentIds) {
  return getByIds(contentIds, 'resume_time_seconds', 0) // todo - add column!
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
        let lastInteractedChildNavToData = await getNavigateTo([firstChild])
        lastInteractedChildNavToData = lastInteractedChildNavToData[firstChild.id] ?? null
        navigateToData[content.id] = buildNavigateTo(
          firstChild,
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
    status: content.status ?? '',
    child: child,
  }
}

/**
 * filter through contents, only keeping the most recent
 * @param {array} contentIds
 * @returns {Promise<number>}
 */
export async function getLastInteractedOf(contentIds) {
  return db.contentProgress.mostRecentlyUpdatedId(contentIds).then(r => r.data ? parseInt(r.data) : undefined)
}

export async function getProgressDataByIds(contentIds) {
  const progress = Object.fromEntries(contentIds.map(id => [id, {
    last_update: 0,
    progress: 0,
    status: '',
  }]))

  await db.contentProgress.getSomeProgressByContentIds(contentIds).then(r => {
    r.data.forEach(p => {
      progress[p.content_id] = {
        last_update: p.updated_at,
        progress: p.progress_percent,
        status: p.state,
      }
    })
  })

  return progress
}

async function getById(contentId, dataKey, defaultValue) {
  return db.contentProgress.getOneProgressByContentId(contentId).then(r => r.data?.[dataKey] ?? defaultValue)
}

async function getByIds(contentIds, dataKey, defaultValue) {
  const progress = Object.fromEntries(contentIds.map(id => [id, defaultValue]))
  await db.contentProgress.getSomeProgressByContentIds(contentIds).then(r => {
    r.data.forEach(p => {
      progress[p.content_id] = p[dataKey] ?? defaultValue
    })
  })
  return progress
}

export async function getAllStarted(limit = null) {
  return db.contentProgress.startedIds(limit).then(r => r.data.map(id => parseInt(id)))
}

export async function getAllCompleted(limit = null) {
  return db.contentProgress.completedIds(limit).then(r => r.data.map(id => parseInt(id)))
}

export async function getAllStartedOrCompleted({
  onlyIds = true,
  brand = null
} = {}) {
  const agoInSeconds = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60 // 60 days in seconds
  const filters = {
    brand: brand ?? undefined,
    updatedAfter: agoInSeconds
  }

  if (onlyIds) {
    return db.contentProgress.startedOrCompletedIds(filters).then(r => r.data.map(id => parseInt(id)))
  } else {
    return db.contentProgress.startedOrCompleted(filters).then(r => {
      return Object.fromEntries(r.data.map(p => [p.content_id, {
        last_update: p.updated_at,
        progress: p.progress_percent,
        status: p.state,
        brand: p.brand,
      }]))
    })
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
export async function getStartedOrCompletedProgressOnly({ brand = undefined } = {}) {
  return db.contentProgress.startedOrCompleted({ brand: brand }).then(r => {
    return Object.fromEntries(r.data.map(p => [p.content_id, p.progress_percent]))
  })
}

export async function contentStatusCompleted(contentId) {
  // return await dataContext.update(
  //   async function (localContext) {
  //     let hierarchy = await fetchHierarchy(contentId)
  //     completeStatusInLocalContext(localContext, contentId, hierarchy)
  //   },
  //   async function () {
  //     return postContentComplete(contentId)
  //   }
  // )
}
export async function contentStatusStarted(contentId) {
  // return await dataContext.update(
  //   async function (localContext) {
  //     let hierarchy = await fetchHierarchy(contentId)
  //     startStatusInLocalContext(localContext, contentId, hierarchy)
  //   },
  //   async function () {
  //     return postContentStart(contentId)
  //   }
  // )
}
export async function contentStatusStarted(contentId) {
  return await dataContext.update(
    async function (localContext) {
      let hierarchy = await fetchHierarchy(contentId)
      startStatusInLocalContext(localContext, contentId, hierarchy)
    },
    async function () {
      return postContentStart(contentId)
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
  setStartedOrCompletedStatusInLocalContext(localContext, contentId, true, hierarchy)
}

function startStatusInLocalContext(localContext, contentId, hierarchy) {
  setStartedOrCompletedStatusInLocalContext(localContext, contentId, false, hierarchy)
}

function setStartedOrCompletedStatusInLocalContext(localContext, contentId, isCompleted, hierarchy) {
  let data = localContext.data[contentId] ?? {}
  data[DATA_KEY_PROGRESS] = isCompleted ? 100 : 0
  data[DATA_KEY_STATUS] = isCompleted ? STATE_COMPLETED : STATE_STARTED
  data[DATA_KEY_LAST_UPDATED_TIME] = Math.round(new Date().getTime() / 1000)
  localContext.data[contentId] = data

  if (!hierarchy) return
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

export async function contentStatusReset(contentId) {
  // await dataContext.update(
  //   async function (localContext) {
  //     let hierarchy = await fetchHierarchy(contentId)
  //     resetStatusInLocalContext(localContext, contentId, hierarchy)
  //   },
  //   async function () {
  //     return postContentReset(contentId)
  //   }
  // )
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

  //

  await db.contentProgress.recordProgress(contentId, null, {
    state: 'started',
    progressPercent: Math.round(Math.random() * 100),
  })

  // await dataContext.update(
  //   async function (localContext) {
  //     if (contentId && updateLocalProgress) {
  //       if (mediaLengthSeconds <= 0) {
  //         return
  //       }
  //       let progress = Math.min(
  //         99,
  //         Math.round(((currentSeconds ?? 0) / Math.max(1, mediaLengthSeconds ?? 0)) * 100)
  //       )
  //       let hierarchy = await fetchHierarchy(contentId)
  //       saveContentProgress(localContext, contentId, progress, currentSeconds, hierarchy)
  //     }
  //   },
  //   async function () {
  //     // return postRecordWatchSession(
  //     //   contentId,
  //     //   mediaTypeId,
  //     //   mediaLengthSeconds,
  //     //   currentSeconds,
  //     //   secondsPlayed,
  //     //   sessionId
  //     // )
  //   }
  // )
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
