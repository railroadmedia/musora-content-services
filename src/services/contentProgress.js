import { getHierarchy, getHierarchies } from './sanity.js'
import { db } from './sync'
import { COLLECTION_ID_SELF, COLLECTION_TYPE, STATE } from './sync/models/ContentProgress'
import { trackUserPractice } from './userActivity'
import { getNextLessonLessonParentTypes } from '../contentTypeConfig.js'
import { getDailySession, onLearningPathCompletedActions } from './content-org/learning-paths.ts'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = [
  '_getAllStartedOrCompleted',
  '_recordWatchSession',
  'averageProgressesFor',
  'bubbleAndTrickleProgressesSafely',
  'bubbleProgress',
  'buildNavigateTo',
  'computeBubbleTrickleProgresses',
  'duplicateProgressForIds',
  'duplicateProgressToALaCarte',
  'filterOutLearningPathsForDuplication',
  'filterOutNegativeProgress',
  'findIncompleteLesson',
  'getAncestorAndSiblingIds',
  'getById',
  'getByIds',
  'getByRecordIds',
  'getChildrenToDepth',
  'handleLearningPathProgressActions',
  'normalizeCollection',
  'normalizeContentId',
  'normalizeContentIds',
  'resetStatus',
  'saveContentProgress',
  'setStartedOrCompletedStatus',
  'setStartedOrCompletedStatusMany',
  'trackProgress',
  'trickleProgress',
]

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
    0,
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

    // todo(BEHSTP-325): consider de-nesting this logic with early returns, for code clarity.
    // does not support passing in 'method-v2' type yet
    if (content.type === COLLECTION_TYPE.LEARNING_PATH) {
      let navigateTo = null

      if (content.id === activeLearningPathId) {
        navigateTo = await getDailySessionNavigateTo(content, dailySession, collection)
      }

      if (!navigateTo) {
        navigateTo = await getFirstOrIncompleteChild(content, collection)
      }

      navigateToData[content.id] = buildNavigateTo(navigateTo, null, collection)

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

    // todo(BEHSTP-325): consider de-nesting this logic with early returns, for code clarity.
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
          // todo(BEHSTP-325): remove if/else and make findIncompleteLesson able to return current lesson if `started`
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

export function findIncompleteLesson(progressOnItems, currentContentId, contentType) {
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

export function buildNavigateTo(content, child = null, collection = null) {
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
    ]),
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

export async function getById(contentId, collection, dataKey, defaultValue) {
  if (!contentId) return defaultValue
  return db.contentProgress
    .getOneProgressByContentId(contentId, collection)
    .then((r) => r.data?.[dataKey] ?? defaultValue)
}

export async function getByIds(contentIds, collection, dataKey, defaultValue) {
  if (contentIds.length === 0) return new Map()

  const progress = new Map(contentIds.map((id) => [id, defaultValue]))
  await db.contentProgress.getSomeProgressByContentIds(normalizeContentIds(contentIds), normalizeCollection(collection)).then((r) => {
    r.data.forEach((p) => {
      progress.set(p.content_id, p[dataKey] ?? defaultValue)
    })
  })
  return progress
}

export async function getByRecordIds(ids, dataKey, defaultValue) {
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
                                    } = {},
) {
  return db.contentProgress.started(limit, { onlyIds, include })
}

export async function getAllCompleted(limit = null, {
                                        onlyIds = true,
                                        include = { aLaCarte: true, learningPaths: false },
                                      } = {},
) {
  return db.contentProgress.completed(limit, { onlyIds, include })
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
                                                 onlyIds = true, // need to be careful if allowing non-alacarte progress, because some content_ids can overlap
                                               } = {}) {
  const data = await _getAllStartedOrCompleted({
    metadata,
    limit,
    include,
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
export async function _getAllStartedOrCompleted({
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
 * @param {int|null} instrumentId - enum value of instrument id
 * @param {int|null} categoryId - enum value of category id
 * @param {boolean|null} isLivestream - determines livestream-specific progress handling
 * @param {boolean} isOffline - whether this watch session is being recorded in offline mode, which affects how progress is tracked and pushed
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
    instrumentId = null,
    categoryId = null,
    isLivestream = false,
    isOffline = false,
    hierarchy = null,
  } = {},
) {
  contentId = normalizeContentId(contentId)
  collection = normalizeCollection(collection)

  // Track practice and progress locally (no immediate push)
  await Promise.all([
    trackPractice(contentId, secondsPlayed, { instrumentId, categoryId }),
    trackProgress(contentId, collection, currentSeconds, mediaLengthSeconds, isLivestream, isOffline, hierarchy),
  ])
}

export async function flushWatchSession() {
  db.contentProgress.requestPushUnsynced('flush-watch-session')
  db.practices.requestPushUnsynced('flush-watch-session')
}

async function trackPractice(contentId, secondsPlayed, details = {}) {
  return trackUserPractice(contentId, secondsPlayed, details)
}

export async function trackProgress(
  contentId,
  collection,
  currentSeconds,
  mediaLengthSeconds,
  isLivestream = false,
  isOffline = false,
  hierarchy = null,
) {
  const progress = Math.max(1, Math.min(
    99,
    Math.round(((currentSeconds ?? 0) / Math.max(1, mediaLengthSeconds)) * 100),
  ))

  if (isLivestream) {
    // resumeTime of a livestream will far exceed VOD length, so set to 0
    // doesn't affect livestream resumeTime, but will send users to 0 seconds in VOD
    currentSeconds = 0
  }
  return saveContentProgress(contentId, collection, progress, currentSeconds, { isOffline, hierarchy, skipPush: true })
}

export async function contentStatusCompleted(contentId, collection = null) {
  collection = collection ?? { id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF }
  return setStartedOrCompletedStatus(contentId, collection, true)
}

export async function contentStatusCompletedMany(contentIds, collection = null) {
  collection = collection ?? { id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF }
  return setStartedOrCompletedStatusMany(contentIds, collection, true)
}

// skipBubbleTrickle is only for starting enrolled GC's as a hack to get them into the progress row.
export async function contentStatusStarted(contentId, collection = null, {
  skipPush = false,
  skipBubbleTrickle = false,
} = {}) {
  collection = collection ?? { id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF }
  return setStartedOrCompletedStatus(
    normalizeContentId(contentId),
    normalizeCollection(collection),
    false,
    { skipPush, skipBubbleTrickle },
  )
}

export async function contentStatusReset(contentId, collection = null, { skipPush = false } = {}) {
  collection = collection ?? { id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF }
  return resetStatus(contentId, collection, { skipPush })
}

// does not have an offline variant because it's too deeply nested within the watch session flow.
export async function saveContentProgress(
  contentId,
  collection,
  progress,
  currentSeconds,
  {
    isOffline = false,
    hierarchy = null,
    skipPush = false,
    accessedDirectly = true,
  } = {},
) {
  collection = collection ?? { id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF }
  const isPlaylist = collection?.type === COLLECTION_TYPE.PLAYLIST

  let allProgresses = {}
  allProgresses[contentId] = progress

  const existingProgress = await getProgressDataByIds(Object.keys(allProgresses), collection)
  allProgresses = filterOutNegativeProgress(allProgresses, existingProgress)
  if (Object.keys(allProgresses).length === 0) {
    return
  }

  if (!isOffline) {
    hierarchy = await getHierarchy(contentId, collection)
  }
  const metadata = hierarchy.metadata || {}

  if (isPlaylist) {
    await duplicateProgressToALaCarte(allProgresses, collection)
    if (!skipPush) db.contentProgress.requestPushUnsynced('save-content-progress')
    return
  }

  const response = await db.contentProgress.recordProgress(
    normalizeContentId(contentId),
    normalizeCollection(collection),
    progress,
    metadata[contentId],
    currentSeconds,
    { skipPush: true, accessedDirectly },
  )

  if (isOffline) {
    await handleLearningPathProgressActions(allProgresses, collection, { isOffline: true })

    if (!skipPush) db.contentProgress.requestPushUnsynced('save-content-progress')
    return response
  }

  let bubbledProgresses = await computeBubbleTrickleProgresses(contentId, progress, collection, hierarchy, { trickle: false })
  Object.assign(allProgresses, bubbledProgresses)

  const existingProgresses = await getProgressDataByIds(Object.keys(bubbledProgresses), collection)
  bubbledProgresses = filterOutNegativeProgress(bubbledProgresses, existingProgresses)

  await bubbleAndTrickleProgressesSafely(bubbledProgresses, collection, metadata, { accessedDirectly })

  await handleLearningPathProgressActions(allProgresses, collection)

  if (!skipPush) db.contentProgress.requestPushUnsynced('save-content-progress')

  return response
}

export async function setStartedOrCompletedStatus(
  contentId,
  collection,
  isCompleted,
  {
    skipPush = false,
    skipBubbleTrickle = false,
  } = {},
) {
  contentId = normalizeContentId(contentId)
  collection = normalizeCollection(collection) ?? { id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF }
  const isPlaylist = collection?.type === COLLECTION_TYPE.PLAYLIST

  const hierarchy = await getHierarchy(contentId, collection)
  const metadata = hierarchy.metadata || {}

  const progress = isCompleted ? 100 : 0
  let allProgresses = { [contentId]: progress }

  if (isPlaylist) {
    await duplicateProgressToALaCarte(allProgresses, collection)
    if (!skipPush) db.contentProgress.requestPushUnsynced('set-started-or-completed-status')
    return
  }

  const response = await db.contentProgress.recordProgress(
    contentId,
    collection,
    progress,
    metadata[contentId],
    null,
    { skipPush: true },
  )

  if (!skipBubbleTrickle) {
    let progresses = await computeBubbleTrickleProgresses(contentId, progress, collection, hierarchy)
    Object.assign(allProgresses, progresses)

    await bubbleAndTrickleProgressesSafely(progresses, collection, metadata)
  }

  await handleLearningPathProgressActions(allProgresses, collection)

  if (!skipPush) db.contentProgress.requestPushUnsynced('set-started-or-completed-status')

  return response
}

export async function setStartedOrCompletedStatusMany(contentIds, collection, isCompleted, { skipPush = false } = {}) {
  contentIds = normalizeContentIds(contentIds)
  collection = normalizeCollection(collection) ?? { id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF }
  const isPlaylist = collection?.type === COLLECTION_TYPE.PLAYLIST

  const hierarchy = await getHierarchies(contentIds, collection)
  const metadata = hierarchy.metadata || {}

  const progress = isCompleted ? 100 : 0
  let allProgresses = Object.fromEntries(contentIds.map(id => [id, progress]))

  if (isPlaylist) {
    await duplicateProgressToALaCarte(allProgresses, collection)
    if (!skipPush) db.contentProgress.requestPushUnsynced('set-started-or-completed-status-many')
    return
  }

  const response = await db.contentProgress.recordProgressMany(
    allProgresses,
    normalizeCollection(collection),
    metadata,
    { skipPush: true },
  )

  let progresses = {}
  for (const contentId of contentIds) {
    progresses = {
      ...progresses,
      ...await computeBubbleTrickleProgresses(contentId, progress, collection, hierarchy),
    }
  }
  Object.assign(allProgresses, progresses)

  await bubbleAndTrickleProgressesSafely(progresses, collection, metadata)

  await handleLearningPathProgressActions(allProgresses, collection)

  if (!skipPush) db.contentProgress.requestPushUnsynced('set-started-or-completed-status-many')

  return response
}

export async function resetStatus(contentId, collection = null, { skipPush = false } = {}) {
  contentId = normalizeContentId(contentId)
  collection = normalizeCollection(collection)

  const progress = 0
  const response = await db.contentProgress.eraseProgress(normalizeContentId(contentId), normalizeCollection(collection), { skipPush: true })

  let allProgresses = {}
  allProgresses[contentId] = progress

  const hierarchy = await getHierarchy(contentId, collection)
  const metadata = hierarchy.metadata || {}

  let progresses = await computeBubbleTrickleProgresses(contentId, progress, collection, hierarchy)
  Object.assign(allProgresses, progresses)

  await bubbleAndTrickleProgressesSafely(progresses, collection, metadata, { isResetAction: true })

  await handleLearningPathProgressActions(allProgresses, collection)

  if (!skipPush) db.contentProgress.requestPushUnsynced('reset-status')

  return response
}

export function filterOutNegativeProgress(progresses, existingProgresses) {
  return Object.fromEntries(
    Object.entries(progresses).filter(
      ([id, progress]) => progress >= (existingProgresses[id]?.progress ?? 0)
    )
  )
}

export async function computeBubbleTrickleProgresses(contentId, progress, collection, hierarchy, {
  bubble = true,
  trickle = true,
} = {}) {
  return {
    ...trickle ? trickleProgress(hierarchy, contentId, collection, progress) : {},
    ...bubble ? (await bubbleProgress(hierarchy, contentId, collection)) : {},
  }
}

export async function handleLearningPathProgressActions(progresses, collection, { isOffline = false } = {}) {
  if (collection?.type !== COLLECTION_TYPE.LEARNING_PATH) {
    return
  }

  await duplicateProgressToALaCarte(progresses, collection)

  if (isOffline) {
    return
  }

  for (const [id, prog] of Object.entries(progresses)) {
    if (
      prog === 100
      && collection?.type === COLLECTION_TYPE.LEARNING_PATH
      && Number(id) === collection?.id
    ) {
      await onLearningPathCompletedActions(Number(id))
    }
  }
}

export async function duplicateProgressToALaCarte(progresses, collection) {

  // a-la-cart LPs not set up.
  let filteredProgresses = filterOutLearningPathsForDuplication(progresses, collection)

  const externalProgresses = await getProgressDataByIds(Object.keys(filteredProgresses), null)

  filteredProgresses = filterOutNegativeProgress(filteredProgresses, externalProgresses)

  await duplicateProgressForIds(filteredProgresses)
}

export function filterOutLearningPathsForDuplication(progresses, collection) {
  return Object.fromEntries(
    Object.entries(progresses).filter(([id]) => {
      if (collection.type === COLLECTION_TYPE.LEARNING_PATH) {
        // dont want progress on a-la-carte LPs (not supported)
        return (+id) !== collection.id
      } else {
        return true
      }
    }),
  )
}

export async function duplicateProgressForIds(entries) {
  return Promise.all(Object.entries(entries).map(([id, pct]) => {
    return saveContentProgress(parseInt(id), null, pct, null, { skipPush: true, accessedDirectly: false })
  }))
}


// agnostic to collection - makes returned data structure simpler,
// as long as callers remember to pass collection where needed
export function trickleProgress(hierarchy, contentId, _collection, progress) {
  const descendantIds = getChildrenToDepth(contentId, hierarchy, MAX_DEPTH)
  return Object.fromEntries(descendantIds.map((id) => [id, progress]))
}

export async function bubbleProgress(hierarchy, contentId, collection = null) {
  const ids = getAncestorAndSiblingIds(hierarchy, contentId)
  const progresses = await getByIds(ids, collection, 'progress_percent', 0)
  return averageProgressesFor(hierarchy, contentId, progresses)
}

export function getAncestorAndSiblingIds(hierarchy, contentId, depth = 1) {
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
export function averageProgressesFor(hierarchy, contentId, progressData, depth = 1) {
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

export function getChildrenToDepth(parentId, hierarchy, depth = 1) {
  let childIds = hierarchy.children[parentId] ?? []
  let allChildrenIds = childIds
  childIds.forEach((id) => {
    allChildrenIds = allChildrenIds.concat(getChildrenToDepth(id, hierarchy, depth - 1))
  })
  return allChildrenIds
}

export async function bubbleAndTrickleProgressesSafely(progresses, collection, metadata, {
  isResetAction = false,
  accessedDirectly = true,
} = {}) {
  let eraseProgresses = {}
  if (isResetAction) {
    eraseProgresses = Object.fromEntries(
      Object.entries(progresses).filter(([_, pct]) => pct === 0),
    )
    progresses = Object.fromEntries(
      Object.entries(progresses).filter(([_, pct]) => pct > 0),
    )
  }

  if (Object.keys(progresses).length > 0) {
    await db.contentProgress.recordProgressMany(
      progresses,
      normalizeCollection(collection),
      metadata,
      { skipPush: true, accessedDirectly },
    )
  }
  if (Object.keys(eraseProgresses).length > 0) {
    const eraseIds = Object.keys(eraseProgresses).map(Number)
    await db.contentProgress.eraseProgressMany(normalizeContentIds(eraseIds), normalizeCollection(collection), { skipPush: true })
  }
}

export function normalizeContentId(contentId) {
  if (typeof contentId === 'string' && isNaN(+contentId)) {
    throw new Error(`Invalid content id: ${contentId}`)
  }
  return typeof contentId === 'string' ? +contentId : contentId
}

export function normalizeContentIds(contentIds) {
  return contentIds.map((id) => normalizeContentId(id))
}

export function normalizeCollection(collection) {
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
      id: collectionId || COLLECTION_ID_SELF,
    },
  }
}
