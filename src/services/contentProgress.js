import { fetchHierarchy, fetchLearningPathHierarchy } from './sanity.js'
import { db } from './sync'
import {COLLECTION_TYPE, STATE} from './sync/models/ContentProgress'
import { trackUserPractice, findIncompleteLesson } from './userActivity'
import { getNextLessonLessonParentTypes } from '../contentTypeConfig.js'

const STATE_STARTED = STATE.STARTED
const STATE_COMPLETED = STATE.COMPLETED
const MAX_DEPTH = 3

export async function getProgressState(contentId) {
  return getById(contentId, 'state', '')
}

export async function getProgressStateByIds(contentIds, collection = null) {
  return getByIds(contentIds, collection, 'state', '')
}

export async function getResumeTimeSecondsByIds(contentIds, collection = null) {
  return getByIds(contentIds, collection, 'resume_time_seconds', 0)
}

export async function getNavigateTo(data, collection = null) {
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
        } else if (['song-tutorial', 'guided-course', COLLECTION_TYPE.LEARNING_PATH].includes(content.type)) { // send to first incomplete
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
  return db.contentProgress.mostRecentlyUpdatedId(contentIds, collection).then(r => r.data ? parseInt(r.data) : undefined)
}

export async function getProgressDataByIds(contentIds, collection) {
  const progress = Object.fromEntries(contentIds.map(id => [id, {
    last_update: 0,
    progress: 0,
    status: '',
  }]))

  await db.contentProgress.getSomeProgressByContentIds(contentIds, collection).then(r => {
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
  if (!contentId) return defaultValue
  return db.contentProgress.getOneProgressByContentId(contentId).then(r => r.data?.[dataKey] ?? defaultValue)
}

async function getByIds(contentIds, collection, dataKey, defaultValue) {
  const progress = Object.fromEntries(contentIds.map(id => [id, defaultValue]))
  await db.contentProgress.getSomeProgressByContentIds(contentIds, collection).then(r => {
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

export async function getAllCompletedByIds(contentIds) {
  return db.contentProgress.completedByContentIds(contentIds)
}

export async function getAllStartedOrCompleted({
  onlyIds = true,
  brand = null,
  limit = null
} = {}) {
  const agoInSeconds = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60 // 60 days in seconds
  const filters = {
    brand: brand ?? undefined,
    updatedAfter: agoInSeconds,
    limit: limit ?? undefined,
  }

  if (onlyIds) {
    return db.contentProgress.startedOrCompletedIds(filters).then(r => r.data.map(id => parseInt(id)))
  } else {
    return db.contentProgress.startedOrCompleted(filters).then(r => {
      return Object.fromEntries(r.data.map(p => [p.content_id, {
        last_update: p.updated_at,
        progress: p.progress_percent,
        status: p.state,
        brand: p.content_brand,
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
  const [session] = await Promise.all([
    trackPractice(contentId, secondsPlayed, prevSession, { instrumentId, categoryId }),
    trackProgress(contentId, collection, currentSeconds, mediaLengthSeconds),
  ])

  return session
}

async function trackPractice(contentId, secondsPlayed, prevSession, details = {}) {
  const session = prevSession || new Map()

  const secondsSinceLastUpdate = Math.ceil(
    secondsPlayed - (session.get(contentId) ?? 0)
  )
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
  return setStartedOrCompletedStatus(contentId, collection, true)
}

export async function contentsStatusCompleted(contentIds, collection = null) {
  return setStartedOrCompletedStatuses(contentIds, collection, true)
}

export async function contentStatusStarted(contentId, collection = null) {
  return setStartedOrCompletedStatus(contentId, collection, false)
}
export async function contentStatusReset(contentId, collection = null) {
  return resetStatus(contentId, collection)
}

async function saveContentProgress(contentId, collection, progress, currentSeconds) {
  const response = await db.contentProgress.recordProgress(contentId, collection, progress, currentSeconds)

  // note - previous implementation explicitly did not trickle progress to children here
  // (only to siblings/parents via le bubbles)

  const bubbledProgresses = bubbleProgress(await getHierarchy(contentId, collection), contentId, collection)
  await db.contentProgress.recordProgressesTentative(bubbledProgresses, collection)

  return response
}

async function setStartedOrCompletedStatus(contentId, collection, isCompleted) {
  const progress = isCompleted ? 100 : 0
  // we explicitly pessimistically await a remote push here
  // because awards may be generated (on server) on completion
  // which we would want to toast the user about *in band*
  const response = await db.contentProgress.recordProgress(contentId, collection, progress)

  const hierarchy = await getHierarchy(contentId, collection)

  await Promise.all([
    db.contentProgress.recordProgressesTentative(trickleProgress(hierarchy, contentId, collection, progress), collection),
    bubbleProgress(hierarchy, contentId, collection).then(bubbledProgresses => db.contentProgress.recordProgressesTentative(bubbledProgresses, collection))
  ])

  return response
}

async function getHierarchy(contentId, collection) {
  if (collection && collection.type === COLLECTION_TYPE.LEARNING_PATH) {
    return await fetchLearningPathHierarchy(contentId, collection)
  } else {
    return await fetchHierarchy(contentId)
  }
}

async function setStartedOrCompletedStatuses(contentIds, collection, isCompleted) {
  const progress = isCompleted ? 100 : 0
  // we explicitly pessimistically await a remote push here
  // because awards may be generated (on server) on completion
  // which we would want to toast the user about *in band*
  const response = await db.contentProgress.recordProgresses(contentIds, collection, progress)

  // we assume this is used only for contents within the same hierarchy
  const hierarchy = await getHierarchy(contentIds[0], collection)

  let ids = {}
  for (const contentId of contentIds) {
    ids = {
      ...ids,
      ...trickleProgress(hierarchy, contentId, collection, progress),
      ...await bubbleProgress(hierarchy, contentId, collection)
    }
  }

  await Promise.all([
    db.contentProgress.recordProgressesTentative(ids, collection),
  ]);

  return response
}

async function resetStatus(contentId, collection = null) {
  const response = await db.contentProgress.eraseProgress(contentId, collection)
  const hierarchy = await getHierarchy(contentId, collection)

  await Promise.all([
    db.contentProgress.recordProgressesTentative(trickleProgress(hierarchy, contentId, collection, 0), collection),
    bubbleProgress(hierarchy, contentId, collection).then(bubbledProgresses => db.contentProgress.recordProgressesTentative(bubbledProgresses, collection))
  ])

  return response
}

// agnostic to collection - makes returned data structure simpler,
// as long as callers remember to pass collection where needed
function trickleProgress(hierarchy, contentId, _collection, progress) {
  const descendantIds = getChildrenToDepth(contentId, hierarchy, MAX_DEPTH)
  return Object.fromEntries(descendantIds.map(id => [id, progress]))
}

async function bubbleProgress(hierarchy, contentId, collection = null)     {
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
    ...getAncestorAndSiblingIds(hierarchy, parentId, depth + 1)
  ]
}

// doesn't accept collection - assumes progresses are already filtered appropriately
// caller would do well to remember this, i doth say
function averageProgressesFor(hierarchy, contentId, progressData, depth = 1) {
  if (depth > MAX_DEPTH) return {}

  const parentId = hierarchy?.parents?.[contentId]
  if (!parentId) return {}

  const parentChildProgress = hierarchy?.children?.[parentId]?.map(childId => {
    return progressData[childId] ?? 0
  })
  const avgParentProgress = parentChildProgress.length > 0 ? Math.round(parentChildProgress.reduce((a, b) => a + b, 0) / parentChildProgress.length) : 0

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
