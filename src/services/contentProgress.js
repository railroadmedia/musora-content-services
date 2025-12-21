import { fetchHierarchy, fetchLearningPathHierarchy } from './sanity.js'
import { db } from './sync'
import { COLLECTION_TYPE, STATE } from './sync/models/ContentProgress'
import { trackUserPractice, findIncompleteLesson } from './userActivity'
import { getNextLessonLessonParentTypes } from '../contentTypeConfig.js'
import { emitContentCompleted } from './progress-events'
import {getDailySession} from "./content-org/learning-paths.ts";
import {getToday} from "./dateUtils.js";
import { fetchBrandsByContentIds } from './sanity.js'

const STATE_STARTED = STATE.STARTED
const STATE_COMPLETED = STATE.COMPLETED
const MAX_DEPTH = 3

export async function getProgressState(contentId, collection = null) {
  return getById(normalizeContentId(contentId), normalizeCollection(collection), 'state', '')
}

export async function getProgressStateByIds(contentIds, collection = null) {
  return getByIds(normalizeContentIds(contentIds), normalizeCollection(collection), 'state', '')
}

export async function getResumeTimeSecondsByIds(contentIds, collection = null) {
  return getByIds(
    normalizeContentIds(contentIds),
    normalizeCollection(collection),
    'resume_time_seconds',
    0
  )
}

export async function getResumeTimeSecondsByIdsAndCollections(tuples) {
  return getByIdsAndCollections(tuples, 'resume_time_seconds', 0)
}

export async function getNavigateToForMethod(data) {
  let navigateToData = {}

  const brand = data[0].content.brand || null
  const dailySessionResponse = await getDailySession(brand, getToday())
  const dailySession = dailySessionResponse?.daily_session || null
  const activeLearningPathId = dailySessionResponse?.active_learning_path_id || null

  for (const tuple of data) {
    if (!tuple) continue

    const {content, collection} = tuple

    const findFirstIncomplete = (progresses) =>
      Object.keys(progresses).find(id => progresses[id] !== STATE_COMPLETED) || null

    const findChildById = (children, id) =>
      children?.find(child => child.id === Number(id)) || null

    const getFirstOrIncompleteChild = async (content, collection) => {
      const childrenIds = content?.children.map(child => child.id) || []
      if (childrenIds.length === 0) return null

      const progresses = await getProgressStateByIds(childrenIds, collection)
      const incompleteId = findFirstIncomplete(progresses)

      return incompleteId ? findChildById(content.children, incompleteId) : content.children[0]
    }

    const getDailySessionNavigateTo = async (content, dailySession, collection) => {
      const dailiesIds = dailySession?.map(item => item.content_ids).flat() || []
      const progresses = await getProgressStateByIds(dailiesIds, collection)
      const incompleteId = findFirstIncomplete(progresses)

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

export async function getNavigateTo(data, collection = null) {
  collection = normalizeCollection(collection)
  let navigateToData = {}

  const twoDepthContentTypes = ['pack'] // not adding method because it has its own logic (with active path)
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
      const contentState = await getProgressState(content.id, collection)
      if (contentState !== STATE_STARTED) {
        const firstChild = validChildren[0]
        let lastInteractedChildNavToData = await getNavigateTo([firstChild], collection)
        lastInteractedChildNavToData = lastInteractedChildNavToData[firstChild.id] ?? null
        navigateToData[content.id] = buildNavigateTo(
          firstChild,
          lastInteractedChildNavToData,
          collection
        ) //no G-child for LP
      } else {
        const childrenStates = await getProgressStateByIds(childrenIds, collection)
        const lastInteracted = await getLastInteractedOf(childrenIds, collection)
        const lastInteractedStatus = childrenStates[lastInteracted]

        if (['course', 'pack-bundle', 'skill-pack'].includes(content.type)) {
          if (lastInteractedStatus === STATE_STARTED) {
            // send to last interacted
            navigateToData[content.id] = buildNavigateTo(
              children.get(lastInteracted),
              null,
              collection
            )
          } else {
            // send to first incomplete after last interacted
            let incompleteChild = findIncompleteLesson(childrenStates, lastInteracted, content.type)
            navigateToData[content.id] = buildNavigateTo(
              children.get(incompleteChild),
              null,
              collection
            )
          }
        } else if (
          ['song-tutorial', 'guided-course', COLLECTION_TYPE.LEARNING_PATH].includes(content.type)
        ) {
          // send to first incomplete
          let incompleteChild = findIncompleteLesson(childrenStates, lastInteracted, content.type)
          navigateToData[content.id] = buildNavigateTo(
            children.get(incompleteChild),
            null,
            collection
          )
        } else if (twoDepthContentTypes.includes(content.type)) {
          // send to navigateTo child of last interacted child
          const firstChildren = content.children ?? []
          const lastInteractedChildId = await getLastInteractedOf(
            firstChildren.map((child) => child.id),
            collection
          )
          if (childrenStates[lastInteractedChildId] === STATE_COMPLETED) {
            // TODO: packs have an extra situation where we need to jump to the next course if all lessons in the last engaged course are completed
          }
          let lastInteractedChildNavToData = await getNavigateTo(firstChildren, collection)
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

  await db.contentProgress.getSomeProgressByContentIds(contentIds, collection).then((r) => {
    r.data.forEach((p) => {
      progress[p.content_id] = {
        last_update: p.updated_at,
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
 * @param {Array<{contentId: number, collection: {type: string, id: number}|null}>} tuples - Array of objects with contentId and collection
 * @returns {Promise<Object>} - Object mapping content IDs to progress data
 *
 * @example
 * const tuples = [
 *   { contentId: 123, collection: { id: 456, type: 'learning-path-v2' } },
 *   { contentId: 789, collection: { id: 101, type: 'learning-path-v2' } },
 *   { contentId: 111, collection: null }
 * ]
 * const progress = await getProgressDataByIdsAndCollections(tuples)
 * // Returns: { 123: { progress: 50, status: 'started', last_update: 123456 }, ... }
 */

// todo: warning: this doesnt work with having 2 items with same contentId but different collection, because
//  of the response structure here with contentId as key
export async function getProgressDataByIdsAndCollections(tuples) {
  tuples = tuples.map(t => ({contentId: normalizeContentId(t.contentId), collection: normalizeCollection(t.collection)}))
  const progress = Object.fromEntries(tuples.map(item => [item.contentId, {
    last_update: 0,
    progress: 0,
    status: '',
    collection: {},
  }]))

  await db.contentProgress.getSomeProgressByContentIdsAndCollections(tuples).then(r => {
    r.data.forEach(p => {
      progress[p.content_id] = {
        last_update: p.updated_at,
        progress: p.progress_percent,
        status: p.state,
        collection: (p.collection_type && p.collection_id) ? {type: p.collection_type, id: p.collection_id} : null
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
  if (contentIds.length === 0) return {}

  const progress = Object.fromEntries(contentIds.map((id) => [id, defaultValue]))
  await db.contentProgress.getSomeProgressByContentIds(contentIds, collection).then((r) => {
    r.data.forEach((p) => {
      progress[p.content_id] = p[dataKey] ?? defaultValue
    })
  })
  return progress
}

async function getByIdsAndCollections(tuples, dataKey, defaultValue) {
  tuples = tuples.map(t => ({contentId: normalizeContentId(t.contentId), collection: normalizeCollection(t.collection)}))
  const progress = Object.fromEntries(tuples.map(tuple => [tuple.contentId, defaultValue]))

  await db.contentProgress.getSomeProgressByContentIdsAndCollections(tuples).then(r => {
    r.data.forEach(p => {
      progress[p.content_id] = p[dataKey] ?? defaultValue
    })
  })
  return progress
}

export async function getAllStarted(limit = null) {
  return db.contentProgress.startedIds(limit)
}

export async function getAllCompleted(limit = null) {
  return db.contentProgress.completedIds(limit)
}

export async function getAllCompletedByIds(contentIds) {
  return db.contentProgress.completedByContentIds(normalizeContentIds(contentIds))
}

/**
 * Fetches content **IDs** for items that were started or completed.
 */
export async function getAllStartedOrCompleted({
  brand = null,
  limit = null,
} = {}) {
  return await _getAllStartedOrCompleted({ brand, limit }).then(recs => recs.map(rec => rec.content_id))
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
  return _getAllStartedOrCompleted({ brand }).then((r) => {
    return Object.fromEntries(r.map((p) => [p.content_id, p.progress_percent]))
  })
}

async function _getAllStartedOrCompleted({
  brand = null,
  limit = null,
} = {}) {
  const agoInSeconds = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60 // 60 days in seconds
  const baseFilters = {
    updatedAfter: agoInSeconds,
  }

  if (!brand) {
    return await db.contentProgress.startedOrCompleted({ ...baseFilters, limit }).then(r => r.data)
  }

  // content_brand can be null (i.e., when progress records created locally)
  // TODO: eventually put content metadata into watermelon so we can
  // always have brand info in progress records and avoid all this

  // for now though, null-ish brands shouldn't be too numerous, so safe to have undefined limit
  const [strictRecs, looseRecs] = await Promise.all([
    db.contentProgress.startedOrCompleted({ ...baseFilters, brand, limit }),
    db.contentProgress.startedOrCompleted({ ...baseFilters, brand: null, limit: undefined })
  ]);

  const map = await fetchBrandsByContentIds(looseRecs.data.map(r => r.content_id));
  const filteredLooseRecs = looseRecs.data.filter(r => map[r.content_id] === brand).map(r => ({ ...r, content_brand: brand }));

  const records = [...strictRecs.data, ...filteredLooseRecs].sort((a, b) => b.updated_at - a.updated_at).slice(0, limit || undefined);
  return records;
}

/**
 * Record watch session
 * @return {string} sessionId - provide in future calls to update progress
 * @param {int} contentId
 * @param {int} mediaLengthSeconds
 * @param {int} currentSeconds
 * @param {int} secondsPlayed
 * @param {string} sessionId - This function records a sessionId to pass into future updates to progress on the same video
 * @param {int} instrumentId - enum value of instrument id
 * @param {int} categoryId - enum value of category id
 */
export async function recordWatchSession(
  contentId,
  collection = null,
  mediaLengthSeconds,
  currentSeconds,
  secondsPlayed,
  prevSession = null,
  instrumentId = null,
  categoryId = null
) {
  contentId = normalizeContentId(contentId)
  collection = normalizeCollection(collection)

  const [session] = await Promise.all([
    trackPractice(contentId, secondsPlayed, prevSession, { instrumentId, categoryId }),
    trackProgress(contentId, collection, currentSeconds, mediaLengthSeconds),
  ])

  return session
}

async function trackPractice(contentId, secondsPlayed, prevSession, details = {}) {
  const session = prevSession || new Map()

  const secondsSinceLastUpdate = Math.ceil(secondsPlayed - (session.get(contentId) ?? 0))
  session.set(contentId, secondsPlayed)

  await trackUserPractice(contentId, secondsSinceLastUpdate, details)
  return session
}

async function trackProgress(contentId, collection, currentSeconds, mediaLengthSeconds) {
  const progress = Math.min(
    99,
    Math.round(((currentSeconds ?? 0) / Math.max(1, mediaLengthSeconds)) * 100)
  )
  return saveContentProgress(contentId, collection, progress, currentSeconds)
}

export async function contentStatusCompleted(contentId, collection = null) {
  return setStartedOrCompletedStatus(
    normalizeContentId(contentId),
    normalizeCollection(collection),
    true
  )
}

export async function contentStatusCompletedMany(contentIds, collection = null) {
  return setStartedOrCompletedStatusMany(
    normalizeContentIds(contentIds),
    normalizeCollection(collection),
    true
  )
}

export async function contentStatusStarted(contentId, collection = null) {
  return setStartedOrCompletedStatus(
    normalizeContentId(contentId),
    normalizeCollection(collection),
    false
  )
}
export async function contentStatusReset(contentId, collection = null) {
  return resetStatus(contentId, collection)
}

async function saveContentProgress(contentId, collection, progress, currentSeconds) {

  // filter out contentIds that are setting progress lower than existing
  const contentIdProgress = await getProgressDataByIds([contentId], collection)
  if (progress <= contentIdProgress[contentId].progress) {
    return
  }

  const response = await db.contentProgress.recordProgress(
    contentId,
    collection,
    progress,
    currentSeconds
  )
  if (progress === 100) emitContentCompleted(contentId, collection)

  // note - previous implementation explicitly did not trickle progress to children here
  // (only to siblings/parents via le bubbles)

  const hierarchy = await getHierarchy(contentId, collection)

  const bubbledProgresses = await bubbleProgress(hierarchy, contentId, collection)

  // filter out contentIds that are setting progress lower than existing
  const existingProgresses = await getProgressDataByIds(Object.keys(bubbledProgresses), collection)
  for (const [bubbledContentId, bubbledProgress] of Object.entries(bubbledProgresses)) {
    if (bubbledProgress <= existingProgresses[bubbledContentId].progress) {
      delete bubbledProgresses[bubbledContentId]
    }
  }

  // BE bubbling/trickling currently does not work, so we utilize non-tentative pushing when learning path collection
  await db.contentProgress.recordProgressMany(bubbledProgresses, collection, collection?.type !== COLLECTION_TYPE.LEARNING_PATH)

  if (collection && collection.type === COLLECTION_TYPE.LEARNING_PATH) {
    let exportIds = bubbledProgresses
    exportIds[contentId] = progress
    await duplicateLearningPathProgressToExternalContents(exportIds, collection, hierarchy)
  }

  for (const [bubbledContentId, bubbledProgress] of Object.entries(bubbledProgresses)) {
    if (bubbledProgress === 100) {
      emitContentCompleted(Number(bubbledContentId), collection)
    }
  }
  return response
}

async function setStartedOrCompletedStatus(contentId, collection, isCompleted) {
  const progress = isCompleted ? 100 : 0
  const response = await db.contentProgress.recordProgress(contentId, collection, progress)

  if (progress === 100) emitContentCompleted(contentId, collection)

  const hierarchy = await getHierarchy(contentId, collection)

  let progresses = {
    ...trickleProgress(hierarchy, contentId, collection, progress),
    ...await bubbleProgress(hierarchy, contentId, collection)
  }
  // BE bubbling/trickling currently does not work, so we utilize non-tentative pushing when learning path collection
  await db.contentProgress.recordProgressMany(progresses, collection, collection?.type !== COLLECTION_TYPE.LEARNING_PATH)

  if (collection && collection.type === COLLECTION_TYPE.LEARNING_PATH) {
    let exportProgresses = progresses
    exportProgresses[contentId] = progress
    await duplicateLearningPathProgressToExternalContents(exportProgresses, collection, hierarchy)
  }

  for (const [id, progress] of Object.entries(progresses)) {
    if (progress === 100) {
      emitContentCompleted(Number(id), collection)
    }
  }

  return response
}

// we cannot simply pass LP id with self collection, because we do not have a-la-carte LP's set up yet,
//   and we need each lesson to bubble to its parent outside of LP
async function duplicateLearningPathProgressToExternalContents(ids, collection, hierarchy) {
  // filter out LPs. we dont want to duplicate to LP's while we dont have a-la-cart LP's set up.
  let filteredIds = Object.fromEntries(
    Object.entries(ids).filter((id) => {
      return hierarchy.parents[parseInt(id)] !== null
    })
  )

  const extProgresses = await getProgressDataByIds(Object.keys(filteredIds), null)

  // overwrite if LP progress greater, unless LP progress was reset to 0
  filteredIds = Object.entries(filteredIds).filter(([id, pct]) => {
    const extPct = extProgresses[id]?.progress
    return (pct !== 0)
      ? pct > extPct
      : false
  })

  // each handles its own bubbling.
  filteredIds.forEach(([id, pct]) => {
    saveContentProgress(parseInt(id), null, pct)
  })
}

async function getHierarchy(contentId, collection) {
  if (collection && collection.type === COLLECTION_TYPE.LEARNING_PATH) {
    return await fetchLearningPathHierarchy(contentId, collection)
  } else {
    return await fetchHierarchy(contentId)
  }
}

async function setStartedOrCompletedStatusMany(contentIds, collection, isCompleted) {
  const progress = isCompleted ? 100 : 0
  const contents = Object.fromEntries(contentIds.map((id) => [id, progress]))
  const response = await db.contentProgress.recordProgressMany(contents, collection, true)

  // we assume this is used only for contents within the same hierarchy
  const hierarchy = await getHierarchy(collection.id, collection)

  let progresses = {}
  for (const contentId of contentIds) {
    progresses = {
      ...progresses,
      ...trickleProgress(hierarchy, contentId, collection, progress),
      ...(await bubbleProgress(hierarchy, contentId, collection)),
    }
  }
  // BE bubbling/trickling currently does not work, so we utilize non-tentative pushing when learning path collection
  await db.contentProgress.recordProgressMany(progresses, collection, collection?.type !== COLLECTION_TYPE.LEARNING_PATH)

  if (collection && collection.type === COLLECTION_TYPE.LEARNING_PATH) {
    let exportProgresses = progresses
    for (const contentId of contentIds){
      exportProgresses[contentId] = progress
    }
    await duplicateLearningPathProgressToExternalContents(exportProgresses, collection, hierarchy)
  }

  return response
}

async function resetStatus(contentId, collection = null) {
  const progress = 0
  const response = await db.contentProgress.eraseProgress(contentId, collection)
  const hierarchy = await getHierarchy(contentId, collection)

  let progresses = {
    ...trickleProgress(hierarchy, contentId, collection, progress),
    ...await bubbleProgress(hierarchy, contentId, collection)
  }
  // BE bubbling/trickling currently does not work, so we utilize non-tentative pushing when learning path collection
  await db.contentProgress.recordProgressMany(progresses, collection, collection?.type !== COLLECTION_TYPE.LEARNING_PATH)

  if (collection && collection.type === COLLECTION_TYPE.LEARNING_PATH) {
    progresses[contentId] = progress
    await duplicateLearningPathProgressToExternalContents(progresses, collection, hierarchy)
  }

  return response
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

  return [
    ...(hierarchy?.children?.[parentId] ?? []),
    ...getAncestorAndSiblingIds(hierarchy, parentId, depth + 1),
  ]
}

// doesn't accept collection - assumes progresses are already filtered appropriately
// caller would do well to remember this, i doth say
function averageProgressesFor(hierarchy, contentId, progressData, depth = 1) {
  if (depth > MAX_DEPTH) return {}

  const parentId = hierarchy?.parents?.[contentId]
  if (!parentId) return {}

  const parentChildProgress = hierarchy?.children?.[parentId]?.map((childId) => {
    return progressData[childId] ?? 0
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
