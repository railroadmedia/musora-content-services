import { getHierarchy, getHierarchies } from './sanity.js'
import { db } from './sync'
import { COLLECTION_ID_SELF, COLLECTION_TYPE, STATE } from './sync/models/ContentProgress'
import { trackUserPractice } from './userActivity'
import { getNextLessonLessonParentTypes } from '../contentTypeConfig.js'
import { getDailySession, onContentCompletedLearningPathActions } from './content-org/learning-paths.ts'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = ['_recordWatchSession']

const STATE_STARTED = STATE.STARTED
const STATE_COMPLETED = STATE.COMPLETED
const MAX_DEPTH = 3
const PUSH_INTERVAL = 30_000

export async function getProgressState(contentId, collection = null) {
  return getById(normalizeContentId(contentId), normalizeCollection(collection), 'state', '')
}

export async function getProgressStateByIds(contentIds, collection = null) {
  return getByIds(normalizeContentIds(contentIds), normalizeCollection(collection), 'state', '')
}

export async function getProgressStateByRecordIds(ids) {
  return getByRecordIds(ids, 'state', '')
}

export async function getResumeTimeSecondsByIds(contentIds, collection = null) {
  return getByIds(
    normalizeContentIds(contentIds),
    normalizeCollection(collection),
    'resume_time_seconds',
    0
  )
}

export async function getResumeTimeSecondsByRecordIds(ids) {
  return getByRecordIds(ids, 'resume_time_seconds', 0)
}

export async function getNavigateToForMethod(data) {
  let navigateToData = {}

  const brand = data[0].brand || null
  const dailySessionResponse = await getDailySession(brand, new Date())
  const dailySession = dailySessionResponse?.daily_session || null
  const activeLearningPathId = dailySessionResponse?.active_learning_path_id || null

  for (const content of data) {
    if (!content) continue

    const { collection } = extractFromRecordId(content.record_id)

    const findFirstIncomplete = (ids, progresses) =>
      ids.find(id => progresses.get(id) !== STATE_COMPLETED) || ids[0]

    const findChildById = (children, id) =>
      children?.find(child => child.id === Number(id)) || null

    const getFirstOrIncompleteChild = async (content, collection) => {
      const childrenIds = content?.children.map(child => child.id) || []
      if (childrenIds.length === 0) return null

      const progresses = await getProgressStateByIds(childrenIds, collection)
      const incompleteId = findFirstIncomplete(childrenIds, progresses)

      return incompleteId ? findChildById(content.children, incompleteId) : content.children[0]
    }

    const getDailySessionNavigateTo = async (content, dailySession, collection) => {
      const dailiesIds = dailySession?.map(item => item.content_ids).flat() || []
      const progresses = await getProgressStateByIds(dailiesIds, collection)
      const incompleteId = findFirstIncomplete(dailiesIds, progresses)

      return incompleteId ? findChildById(content.children, incompleteId) : null
    }

    // does not support passing in 'method-v2' type yet
    if (content.type === COLLECTION_TYPE.LEARNING_PATH) {
      let navigateTo = null

      if (content.id === activeLearningPathId) {
        navigateTo = await getDailySessionNavigateTo(content, dailySession, collection)
      }

      if (!navigateTo) {
        navigateTo = await getFirstOrIncompleteChild(content, collection)
      }

      navigateToData[content.id] =buildNavigateTo(navigateTo, null, collection)

    } else {
      navigateToData[content.id] = null
    }
  }
  return navigateToData
}

export async function getNavigateTo(data) {
  let navigateToData = {}

  const twoDepthContentTypes = ['course-collection'] // not adding method because it has its own logic (with active path)
  //TODO add parent hierarchy upwards as well
  // data structure is the same but instead of child{} we use parent{}
  for (const content of data) {
    // Skip null/undefined entries (can happen when GROQ dereference doesn't match filter)
    if (!content) continue

    //only calculate nextLesson if needed, based on content type
    if (!getNextLessonLessonParentTypes.includes(content.type) || !content.children) {
      navigateToData[content.id] = null
    } else {
      // Filter out null/undefined children (can happen with permission filters)
      const validChildren = content.children.filter(Boolean)
      if (validChildren.length === 0) {
        navigateToData[content.id] = null
        continue
      }

      const children = new Map()
      const childrenIds = []
      validChildren.forEach((child) => {
        childrenIds.push(child.id)
        children.set(child.id, child)
      })
      // return first child (or grand child) if parent-content is complete or no progress
      const contentState = await getProgressState(content.id)
      if (contentState !== STATE_STARTED) {
        const firstChild = validChildren[0]
        let lastInteractedChildNavToData = await getNavigateTo([firstChild])
        lastInteractedChildNavToData = lastInteractedChildNavToData[firstChild.id] ?? null
        navigateToData[content.id] = buildNavigateTo(
          firstChild,
          lastInteractedChildNavToData,
        ) //no G-child for LP
      } else {
        const childrenStates = await getProgressStateByIds(childrenIds)
        const lastInteracted = await getLastInteractedOf(childrenIds)
        const lastInteractedStatus = childrenStates.get(lastInteracted)

        if (['course', 'skill-pack', 'song-tutorial'].includes(content.type)) {
          if (lastInteractedStatus === STATE_STARTED) {
            // send to last interacted
            navigateToData[content.id] = buildNavigateTo(
              children.get(lastInteracted),
              null,
            )
          } else {
            // send to first incomplete after last interacted
            let incompleteChild = findIncompleteLesson(childrenStates, lastInteracted, content.type)
            navigateToData[content.id] = buildNavigateTo(
              children.get(incompleteChild),
              null,
            )
          }
        } else if (
          ['guided-course', COLLECTION_TYPE.LEARNING_PATH].includes(content.type)
        ) {
          // send to first incomplete
          let incompleteChild = findIncompleteLesson(childrenStates, lastInteracted, content.type)
          navigateToData[content.id] = buildNavigateTo(
            children.get(incompleteChild),
            null,
          )
        } else if (twoDepthContentTypes.includes(content.type)) {
          // send to navigateTo child of last interacted child
          const firstChildren = content.children ?? []
          const lastInteractedChildId = await getLastInteractedOf(
            firstChildren.map((child) => child.id),
          )
          if (childrenStates.get(lastInteractedChildId) === STATE_COMPLETED) {
            // TODO: course collections have an extra situation where we need to jump to the next course if all lessons in the last engaged course are completed
          }
          let lastInteractedChildNavToData = await getNavigateTo(firstChildren)
          lastInteractedChildNavToData = lastInteractedChildNavToData[lastInteractedChildId]
          navigateToData[content.id] = buildNavigateTo(
            children.get(lastInteractedChildId),
            lastInteractedChildNavToData,
          )
        }
      }
    }
  }
  return navigateToData
}

function findIncompleteLesson(progressOnItems, currentContentId, contentType) {
  const isMap = progressOnItems instanceof Map
  const ids = isMap ? Array.from(progressOnItems.keys()) : Object.keys(progressOnItems).map(Number)
  const getProgress = (id) => isMap ? progressOnItems.get(id) : progressOnItems[id]

  if (contentType === 'guided-course' || contentType === COLLECTION_TYPE.LEARNING_PATH) {
    return ids.find((id) => getProgress(id) !== 'completed') || ids.at(0)
  }

  const currentIndex = ids.indexOf(Number(currentContentId))
  if (currentIndex === -1) return null

  for (let i = currentIndex + 1; i < ids.length; i++) {
    const id = ids[i]
    if (getProgress(id) !== 'completed') {
      return id
    }
  }

  return ids[0]
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
  return db.contentProgress
    .mostRecentlyUpdatedId(normalizeContentIds(contentIds), normalizeCollection(collection))
    .then((r) => (r.data ? parseInt(r.data) : undefined))
}

export async function getProgressDataByIds(contentIds, collection) {
  contentIds = normalizeContentIds(contentIds)
  collection = normalizeCollection(collection)

  const progress = Object.fromEntries(
    contentIds.map((id) => [
      id,
      {
        last_update: 0,
        progress: 0,
        status: '',
      },
    ])
  )

  await db.contentProgress.getSomeProgressByContentIds(normalizeContentIds(contentIds), normalizeCollection(collection)).then((r) => {
    r.data.forEach((p) => {
      progress[p.content_id] = {
        last_update: p.last_interacted_a_la_carte,
        progress: p.progress_percent,
        status: p.state,
      }
    })
  })

  return progress
}

/**
 * Get progress data for multiple content IDs, each with their own collection context.
 * Useful when fetching progress for tuples that belong to different collections.
 *
 * @param ids {Array<string>} - Array of record ids
 * @returns {Promise<Object>} - Object mapping content IDs to progress data
 *
 * @example
 * const tuples = [
 *   { contentId: 123, collection: { id: 456, type: 'learning-path-v2' } },
 *   { contentId: 789, collection: { id: 101, type: 'learning-path-v2' } },
 *   { contentId: 111, collection: null }
 * ]
 * const progress = await getProgressDataByRecordIds(tuples)
 * // Returns: { 123: { progress: 50, status: 'started', last_update: 123456 }, ... }
 */

export async function getProgressDataByRecordIds(ids) {
  const progress = Object.fromEntries(ids.map(id => [id, {
    last_update: 0,
    progress: 0,
    status: '',
  }]))

  await db.contentProgress.getSomeProgressByRecordIds(ids).then(r => {
    r.data.forEach(p => {
      progress[p.id] = {
        last_update: p.updated_at,
        progress: p.progress_percent,
        status: p.state,
      }
    })
  })
  return progress
}

async function getById(contentId, collection, dataKey, defaultValue) {
  if (!contentId) return defaultValue
  return db.contentProgress
    .getOneProgressByContentId(contentId, collection)
    .then((r) => r.data?.[dataKey] ?? defaultValue)
}

async function getByIds(contentIds, collection, dataKey, defaultValue) {
  if (contentIds.length === 0) return new Map()

  const progress = new Map(contentIds.map((id) => [id, defaultValue]))
  await db.contentProgress.getSomeProgressByContentIds(normalizeContentIds(contentIds), normalizeCollection(collection)).then((r) => {
    r.data.forEach((p) => {
      progress.set(p.content_id, p[dataKey] ?? defaultValue)
    })
  })
  return progress
}

async function getByRecordIds(ids, dataKey, defaultValue) {
  const progress = Object.fromEntries(ids.map(id => [id, defaultValue]))

  await db.contentProgress.getSomeProgressByRecordIds(ids).then(r => {
    r.data.forEach(p => {
      progress[p.id] = p[dataKey] ?? defaultValue
    })
  })
  return progress
}

export async function getAllStarted(limit = null, {
  onlyIds = true,
  include = { aLaCarte: true, learningPaths: false },
} = {}
) {
  return db.contentProgress.started(limit, {onlyIds, include})
}

export async function getAllCompleted(limit = null, {
  onlyIds = true,
  include = { aLaCarte: true, learningPaths: false },
} = {}
) {
  return db.contentProgress.completed(limit, {onlyIds, include})
}

export async function getAllCompletedByIds(contentIds) {
  return db.contentProgress.completedByContentIds(normalizeContentIds(contentIds))
}

/**
 * Fetches content **IDs** for items that were started or completed.
 */
export async function getAllStartedOrCompleted({
  metadata = null,
  limit = null,
  include = { aLaCarte: true, learningPaths: false },
  onlyIds = true // need to be careful if allowing non-alacarte progress, because some content_ids can overlap
} = {}) {
  const data = await _getAllStartedOrCompleted({
    metadata,
    limit,
    include
  })
  return onlyIds
    ? data.map(rec => rec.content_id)
    : data
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
  const metadata = { brand }
  return _getAllStartedOrCompleted({ metadata }).then((r) => {
    return Object.fromEntries(r.map((p) => [p.content_id, p.progress_percent]))
  })
}

/**
 *
 * @param {object|null} metadata - metadata filters
 * @param {string} metadata.brand - optional filter to fetch progress for a specific brand
 * @param {string[]} metadata.contentTypes - optional filter to fetch progress of specific content types
 * @param {number} metadata.parentId - optional filter to fetch progress for a child of a specific parent id
 * @param {object} include - what collection types to include in results
 * @param {number|null} limit
 * @returns {Promise<any[]>}
 * @private
 */
async function _getAllStartedOrCompleted({
  metadata = null,
  limit = null,
  include = { aLaCarte: true, learningPaths: false },
} = {}) {
  const agoInSeconds = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60 // 60 days in seconds
  const baseFilters = {
    updatedAfter: agoInSeconds,
    include: include,
    brand: metadata?.brand,
    contentTypes: metadata?.contentTypes,
    parentId: metadata?.parentId,
  }

  return (await db.contentProgress.startedOrCompleted({ ...baseFilters, limit })).data
}

/**
 * Record watch session
 * @return {string} sessionId - provide in future calls to update progress
 * @param {int} contentId
 * @param {any} collection - progress collection context, null if a-la-carte
 * @param {string} collection.type - enum value of collection type
 * @param {int} collection.id - content_id of parent collection (e.g. learning path content_id)
 * @param {int} mediaLengthSeconds - total length of video media || live event duration if livestream
 * @param {int} currentSeconds - seconds timestamp relative to beginning of video
 * @param {int} secondsPlayed - seconds played in this watch session (since last pause)
 * @param {string|null} prevSession - This function records a sessionId to pass into future updates to progress on the same video
 * @param {int|null} instrumentId - enum value of instrument id
 * @param {int|null} categoryId - enum value of category id
 * @param {boolean|null} isLivestream - determines livestream-specific progress handling
 */
export async function recordWatchSession(
  contentId,
  collection = null,
  mediaLengthSeconds,
  currentSeconds,
  secondsPlayed,
  prevSession = null,
  instrumentId = null,
  categoryId = null,
  isLivestream = false,
) {
  return _recordWatchSession(
    contentId,
    mediaLengthSeconds,
    currentSeconds,
    secondsPlayed,
    {
      collection,
      prevSession,
      instrumentId,
      categoryId,
      isLivestream,
    })
}

/**
 * internal function to be called by only or offline version of recordWatchSession
 * @return {string} sessionId - provide in future calls to update progress
 * @param {int} contentId
 * @param {any} collection - progress collection context, null if a-la-carte
 * @param {string} collection.type - enum value of collection type
 * @param {int} collection.id - content_id of parent collection (e.g. learning path content_id)
 * @param {int} mediaLengthSeconds - total length of video media || live event duration if livestream
 * @param {int} currentSeconds - seconds timestamp relative to beginning of video
 * @param {int} secondsPlayed - seconds played in this watch session (since last pause)
 * @param {string|null} prevSession - This function records a sessionId to pass into future updates to progress on the same video
 * @param {int|null} instrumentId - enum value of instrument id
 * @param {int|null} categoryId - enum value of category id
 * @param {boolean|null} isLivestream - determines livestream-specific progress handling
 * @param {object|null} hierarchy - response from getHierarchy, passed in to avoid redundant calls within the same session
 * @private
 */
export async function _recordWatchSession(
  contentId,
  mediaLengthSeconds,
  currentSeconds,
  secondsPlayed,
  {
    collection = null,
    prevSession = null,
    instrumentId = null,
    categoryId = null,
    isLivestream = false,
    hierarchy = null,
  } = {}
) {
  contentId = normalizeContentId(contentId)
  collection = normalizeCollection(collection)

  if (!prevSession) {
    prevSession = {
      pushInterval: null
    }
  }

  // Track practice and progress locally (no immediate push)
  await Promise.all([
    trackPractice(contentId, secondsPlayed, { instrumentId, categoryId }),
    trackProgress(contentId, collection, currentSeconds, mediaLengthSeconds, isLivestream, hierarchy),
  ])

  if (!prevSession.pushInterval) {
    prevSession.pushInterval = setInterval(() => {
      flushWatchSession()
    }, PUSH_INTERVAL)
  }
  return prevSession
}

export async function flushWatchSession(sessionToFlush = null, shouldClearInterval = true) {
  if (shouldClearInterval && sessionToFlush?.pushInterval) {
    clearInterval(sessionToFlush.pushInterval)
    sessionToFlush.pushInterval = null
  }

  db.contentProgress.requestPushUnsynced('flush-watch-session')
  db.practices.requestPushUnsynced('flush-watch-session')
}

async function trackPractice(contentId, secondsPlayed, details = {}) {
  return trackUserPractice(contentId, secondsPlayed, details)
}

async function trackProgress(
  contentId,
  collection,
  currentSeconds,
  mediaLengthSeconds,
  isLivestream = false,
  hierarchy = null,
) {
  const progress = Math.max(1, Math.min(
    99,
    Math.round(((currentSeconds ?? 0) / Math.max(1, mediaLengthSeconds)) * 100)
  ))

  if (isLivestream) {
    // resumeTime of a livestream will far exceed VOD length, so set to 0
    // doesn't affect livestream resumeTime, but will send users to 0 seconds in VOD
    currentSeconds = 0
  }
  return saveContentProgress(contentId, collection, progress, currentSeconds, { hierarchy, skipPush: true })
}

export async function contentStatusCompleted(contentId, collection = null, hierarchy = null) {
  collection = collection ?? {id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF}
  return setStartedOrCompletedStatus(
    normalizeContentId(contentId),
    normalizeCollection(collection),
    true,
    { hierarchy }
  )
}

export async function contentStatusCompletedMany(contentIds, collection = null, hierarchy = null) {
  collection = collection ?? {id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF}
  return setStartedOrCompletedStatusMany(
    normalizeContentIds(contentIds),
    normalizeCollection(collection),
    true,
    { hierarchy }
  )
}

export async function contentStatusStarted(contentId, collection = null, hierarchy = null) {
  collection = collection ?? {id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF}
  return setStartedOrCompletedStatus(
    normalizeContentId(contentId),
    normalizeCollection(collection),
    false,
    { hierarchy }
  )
}
export async function contentStatusReset(contentId, collection = null, {hierarchy = null, skipPush = false} = {}) {
  collection = collection ?? {id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF}
  return resetStatus(contentId, collection, {hierarchy, skipPush})
}

async function saveContentProgress(
  contentId,
  collection,
  progress,
  currentSeconds,
  {
    hierarchy = null,
    skipPush = false,
    accessedDirectly = true,
  } = {}
) {
  collection = collection ?? {id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF}
  const isLP = collection?.type === COLLECTION_TYPE.LEARNING_PATH
  const isPlaylist = collection?.type === COLLECTION_TYPE.PLAYLIST

  // filter out contentIds that are setting progress lower than existing
  const contentIdProgress = await getProgressDataByIds([contentId], collection)
  const currentProgress = contentIdProgress[contentId].progress;
  if (progress <= currentProgress) {
    progress = currentProgress;
  }

  let offline = false
  if (hierarchy) {
    offline = true
  } else {
    hierarchy = await getHierarchy(contentId, collection)
  }
  const metadata = hierarchy.metadata || {}

  if (isPlaylist) {
    const exportIds = { [contentId]: progress }
    await duplicateProgressToALaCarte(exportIds, collection, {skipPush: true})
    return
  }

  const response = await db.contentProgress.recordProgress(
    normalizeContentId(contentId),
    normalizeCollection(collection),
    progress,
    metadata[contentId],
    currentSeconds,
    {skipPush: true, accessedDirectly}
  )
  // note - previous implementation explicitly did not trickle progress to children here
  // (only to siblings/parents via le bubbles)

  // skip bubbling if progress hasnt changed, or if offline
  if (progress === currentProgress || offline) {
    if (!skipPush) db.contentProgress.requestPushUnsynced('save-content-progress')
    return response
  }

  const bubbledProgresses = await bubbleProgress(hierarchy, contentId, collection)

  // filter out contentIds that are setting progress lower than existing
  const existingProgresses = await getProgressDataByIds(Object.keys(bubbledProgresses), collection)
  for (const [bubbledContentId, bubbledProgress] of Object.entries(bubbledProgresses)) {
    if (bubbledProgress < existingProgresses[bubbledContentId].progress) {
      delete bubbledProgresses[bubbledContentId]
    }
  }

  if (Object.keys(bubbledProgresses).length > 0) {
    await db.contentProgress.recordProgressMany(
      bubbledProgresses,
      normalizeCollection(collection),
      metadata,
      {skipPush: true, accessedDirectly})
  }

  // there are problems if we allow downloading LPs, since we require 2 different hierarchies for this.
  if (isLP) {
    let exportIds = bubbledProgresses
    exportIds[contentId] = progress
    await duplicateProgressToALaCarte(exportIds, collection, {skipPush: true})
  }

  if (progress === 100) await onContentCompletedLearningPathActions(contentId, collection)

  for (const [bubbledContentId, bubbledProgress] of Object.entries(bubbledProgresses)) {
    if (bubbledProgress === 100) {
      await onContentCompletedLearningPathActions(Number(bubbledContentId), collection)
    }
  }

  if (!skipPush) db.contentProgress.requestPushUnsynced('save-content-progress')

  return response
}

async function setStartedOrCompletedStatus(contentId, collection, isCompleted, { hierarchy = null, skipPush = false } = {}) {
  const isLP = collection?.type === COLLECTION_TYPE.LEARNING_PATH

  let offline = false
  if (hierarchy) {
    offline = true
  } else {
    hierarchy = await getHierarchy(contentId, collection)
  }
  const metadata = hierarchy.metadata || {}

  const progress = isCompleted ? 100 : 0
  const response = await db.contentProgress.recordProgress(
    normalizeContentId(contentId),
    normalizeCollection(collection),
    progress,
    metadata[contentId],
    null,
    {skipPush: true}
  )

  // skip bubbling if offline
  if (offline) {
    if (!skipPush) db.contentProgress.requestPushUnsynced('save-content-progress')
    return response
  }

  let progresses = {
    ...trickleProgress(hierarchy, contentId, collection, progress),
    ...await bubbleProgress(hierarchy, contentId, collection)
  }

  await bubbleAndTrickleProgressesSafely(progresses, collection, metadata, false)

  if (isLP) {
    let exportProgresses = progresses
    exportProgresses[contentId] = progress
    await duplicateProgressToALaCarte(exportProgresses, collection, {skipPush: true})
  }

  if (progress === 100) await onContentCompletedLearningPathActions(contentId, collection)

  for (const [id, progress] of Object.entries(progresses)) {
    if (progress === 100) {
      await onContentCompletedLearningPathActions(Number(id), collection)
    }
  }

  if (!skipPush) db.contentProgress.requestPushUnsynced('set-started-or-completed-status')

  return response
}

async function setStartedOrCompletedStatusMany(contentIds, collection, isCompleted, { hierarchy = null, skipPush = false } = {}) {
  const isLP = collection?.type === COLLECTION_TYPE.LEARNING_PATH
  const progress = isCompleted ? 100 : 0

  let offline = false
  if (hierarchy) {
    offline = true
  } else {
    hierarchy = await getHierarchies(contentIds, collection)
  }
  const metadata = hierarchy.metadata || {}

  const contents = Object.fromEntries(contentIds.map((id) => [id, progress]))
  const response = await db.contentProgress.recordProgressMany(
    contents,
    normalizeCollection(collection),
    metadata,
    {skipPush: true}
  )

  // skip bubbling if offline
  if (offline) {
    if (!skipPush) db.contentProgress.requestPushUnsynced('save-content-progress')
    return response
  }

  let progresses = {}
  for (const contentId of contentIds) {
    progresses = {
      ...progresses,
      ...trickleProgress(hierarchy, contentId, collection, progress),
      ...(await bubbleProgress(hierarchy, contentId, collection)),
    }
  }
  await bubbleAndTrickleProgressesSafely(progresses, collection, metadata, false)

  if (isLP) {
    let exportProgresses = progresses
    for (const contentId of contentIds){
      exportProgresses[contentId] = progress
    }
    await duplicateProgressToALaCarte(exportProgresses, collection, {skipPush: true})
  }

  if (progress === 100) {
    for (const contentId of contentIds) {
      await onContentCompletedLearningPathActions(contentId, collection)
    }
  }
  for (const [id, progress] of Object.entries(progresses)) {
    if (progress === 100) {
      await onContentCompletedLearningPathActions(Number(id), collection)
    }
  }

  if (!skipPush) db.contentProgress.requestPushUnsynced('set-started-or-completed-status-many')

  return response
}

async function resetStatus(contentId, collection = null, { hierarchy = null, skipPush = false } = {}) {
  const isLP = collection?.type === COLLECTION_TYPE.LEARNING_PATH

  const progress = 0
  const response = await db.contentProgress.eraseProgress(normalizeContentId(contentId), normalizeCollection(collection), {skipPush: true})

  let offline = false
  if (hierarchy) {
    offline = true
   } else {
    hierarchy = await getHierarchy(contentId, collection)
  }
  const metadata = hierarchy.metadata || {}

  // skip bubbling if offline
  if (offline) {
    if (!skipPush) db.contentProgress.requestPushUnsynced('save-content-progress')
    return response
  }

  let progresses = {
    ...trickleProgress(hierarchy, contentId, collection, progress),
    ...await bubbleProgress(hierarchy, contentId, collection)
  }

  await bubbleAndTrickleProgressesSafely(progresses, collection, metadata, true)

  if (isLP) {
    progresses[contentId] = progress
    await duplicateProgressToALaCarte(progresses, collection, {skipPush: true})
  }

  if (!skipPush) db.contentProgress.requestPushUnsynced('reset-status')

  return response
}

async function duplicateProgressToALaCarte(progresses, collection, {skipPush = false} = {}) {

  // a-la-cart LPs not set up.
  let filteredProgresses = filterOutLearningPathsForDuplication(progresses, collection)

  const externalProgresses = await getProgressDataByIds(Object.keys(filteredProgresses), null)

  filteredProgresses = filterGreaterThanProgress(filteredProgresses, externalProgresses)

  duplicateProgressForIds(filteredProgresses, skipPush)
}

function filterOutLearningPathsForDuplication(progresses, collection) {
  return Object.fromEntries(
    Object.entries(progresses).filter(([id]) => {
      if (collection.type === COLLECTION_TYPE.LEARNING_PATH) {
        // dont want progress on a-la-carte LPs (not supported)
        return id !== collection.id
      } else {
        return true
      }
    })
  )
}

function filterGreaterThanProgress(progresses, external) {
  // overwrite if LP progress greater, unless LP progress was reset to 0
  return Object.entries(progresses).filter(([id, pct]) => {
    const extPct = external[id]?.progress
    return (pct !== 0)
      ? pct > extPct
      : false
  })
}

async function duplicateProgressForIds(ids, skipPush) {
  ids.forEach(([id, pct], index) => {
    let skip = true
    if (index === ids.length - 1) {
      // only allow push on last call, to group into one push
      skip = skipPush
    }
    saveContentProgress(parseInt(id), null, pct, null, {skipPush: skip, accessedDirectly: false})
  })
}


// agnostic to collection - makes returned data structure simpler,
// as long as callers remember to pass collection where needed
function trickleProgress(hierarchy, contentId, _collection, progress) {
  const descendantIds = getChildrenToDepth(contentId, hierarchy, MAX_DEPTH)
  return Object.fromEntries(descendantIds.map((id) => [id, progress]))
}

async function bubbleProgress(hierarchy, contentId, collection = null) {
  const ids = getAncestorAndSiblingIds(hierarchy, contentId)
  const progresses = await getByIds(ids, collection, 'progress_percent', 0)
  return averageProgressesFor(hierarchy, contentId, progresses)
}

function getAncestorAndSiblingIds(hierarchy, contentId, depth = 1) {
  if (depth > MAX_DEPTH) return []

  const parentId = hierarchy?.parents?.[contentId]
  if (!parentId) return []

  if (parentId === contentId) {
    console.error('Circular dependency detected for contentId', contentId)
    return []
  }

  const siblingIds = hierarchy?.children?.[parentId] ?? []

  const allIds = [
    ...siblingIds,
    parentId,
    ...getAncestorAndSiblingIds(hierarchy, parentId, depth + 1),
  ]

  return [...new Set(allIds)]
}

// doesn't accept collection - assumes progresses are already filtered appropriately
// caller would do well to remember this, i doth say
function averageProgressesFor(hierarchy, contentId, progressData, depth = 1) {
  if (depth > MAX_DEPTH) return {}

  const parentId = hierarchy?.parents?.[contentId]
  if (!parentId) return {}

  const parentChildProgress = hierarchy?.children?.[parentId]?.map((childId) => {
    return progressData.get(childId) ?? 0
  })
  const avgParentProgress =
    parentChildProgress.length > 0
      ? Math.round(parentChildProgress.reduce((a, b) => a + b, 0) / parentChildProgress.length)
      : 0

  return {
    ...averageProgressesFor(hierarchy, parentId, progressData, depth + 1),
    [parentId]: avgParentProgress,
  }
}

function getChildrenToDepth(parentId, hierarchy, depth = 1) {
  let childIds = hierarchy.children[parentId] ?? []
  let allChildrenIds = childIds
  childIds.forEach((id) => {
    allChildrenIds = allChildrenIds.concat(getChildrenToDepth(id, hierarchy, depth - 1))
  })
  return allChildrenIds
}

async function bubbleAndTrickleProgressesSafely(progresses, collection, metadata, isResetAction) {
  let eraseProgresses = {}
  if (isResetAction) {
    eraseProgresses = Object.fromEntries(
      Object.entries(progresses).filter(([_, pct]) => pct === 0)
    )
    progresses = Object.fromEntries(
      Object.entries(progresses).filter(([_, pct]) => pct > 0)
    )
  }

  if (Object.keys(progresses).length > 0) {
    await db.contentProgress.recordProgressMany(
      progresses,
      normalizeCollection(collection),
      metadata,
      {skipPush: true}
    )
  }
  if (Object.keys(eraseProgresses).length > 0) {
    const eraseIds = Object.keys(eraseProgresses).map(Number)
    await db.contentProgress.eraseProgressMany(normalizeContentIds(eraseIds), normalizeCollection(collection), {skipPush: true})
  }
}

function normalizeContentId(contentId) {
  if (typeof contentId === 'string' && isNaN(+contentId)) {
    throw new Error(`Invalid content id: ${contentId}`)
  }
  return typeof contentId === 'string' ? +contentId : contentId
}

function normalizeContentIds(contentIds) {
  return contentIds.map((id) => normalizeContentId(id))
}

function normalizeCollection(collection) {
  if (!collection) return null

  if (!Object.values(COLLECTION_TYPE).includes(collection.type)) {
    throw new Error(`Invalid collection type: ${collection.type}`)
  }

  if (typeof collection.id === 'string' && isNaN(+collection.id)) {
    throw new Error(`Invalid collection id: ${collection.id}`)
  }

  return {
    type: collection.type,
    id: typeof collection.id === 'string' ? +collection.id : collection.id,
  }
}

export async function getIdsWhereLastAccessedFromMethod(contentIds) {
  const records = await db.contentProgress.getSomeProgressWhereLastAccessedFromMethod(normalizeContentIds(contentIds))

  return records.data.map(record => record.content_id)
}

export function generateRecordId(contentId, collection) {
  if (!contentId) return null

  contentId = normalizeContentId(contentId)

  return `${contentId}:${collection?.type || COLLECTION_TYPE.SELF}:${collection?.id || COLLECTION_ID_SELF}`
}

export function extractFromRecordId(recordId) {
  if (!recordId) return null

  const contentId = Number(recordId.split(':')[0])
  const collectionType = recordId.split(':')[1]
  const collectionId = Number(recordId.split(':')[2])

  return {
    contentId,
    collection: {
      type: collectionType || COLLECTION_TYPE.SELF,
      id: collectionId || COLLECTION_ID_SELF
    }
  }
}
