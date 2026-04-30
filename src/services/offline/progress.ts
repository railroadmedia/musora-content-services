import {
  _recordWatchSession, resetStatus,
  setStartedOrCompletedStatus,
  setStartedOrCompletedStatusMany,
} from '../contentProgress.js'
import { COLLECTION_ID_SELF, COLLECTION_TYPE, CollectionParameter, STATE } from '../sync/models/ContentProgress'

interface HierarchyParameter {
  topLevelId: number
  parents: { [contentId: number]: [parentId: number] }
  children: { [contentId: number]: [childId: number] }
  metadata: {
    brand: string
    parent_id: number
    type: string
  }
}

/**
 * @param contentId
 * @param mediaLengthSeconds - Total length of the media
 * @param currentSeconds - Playhead position at session end
 * @param secondsPlayed - Seconds actively watched in this session
 * @param hierarchy - Content hierarchy used to update parent progress offline
 * @param options.collection - Collection context; defaults to self
 * @param options.instrumentId - Instrument filter for the session
 * @param options.categoryId - Category filter for the session
 */
export async function recordWatchSessionOffline(
  contentId: number,
  mediaLengthSeconds: number,
  currentSeconds: number,
  secondsPlayed: number,
  hierarchy: HierarchyParameter,
  {
    collection = null,
    instrumentId = null,
    categoryId = null,
  }: {
    collection?: CollectionParameter|null,
    instrumentId?: number|null,
    categoryId?: number|null
  } = {}
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
      isOffline: true,
      hierarchy,
    })
}

/**
 * @param contentId
 * @param collection - Collection context; defaults to self
 * @param hierarchy - Content hierarchy used to update parent progress offline
 */
export async function contentStatusCompletedOffline(contentId: number, collection: CollectionParameter = null, hierarchy: HierarchyParameter) {
  collection = collection ?? {id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF}
  return setStartedOrCompletedStatus(contentId, collection, true, {isOffline: true, hierarchy})
}

/**
 * @param contentIds
 * @param collection - Collection context; defaults to self
 * @param hierarchy - Content hierarchy used to update parent progress offline
 */
export async function contentStatusCompletedManyOffline(contentIds: number[], collection: CollectionParameter = null, hierarchy: HierarchyParameter) {
  collection = collection ?? {id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF}
  return setStartedOrCompletedStatusMany(contentIds, collection, true, {isOffline: true, hierarchy})
}

/**
 * @param contentId
 * @param collection - Collection context; defaults to self
 * @param hierarchy - Content hierarchy used to update parent progress offline
 */
export async function contentStatusStartedOffline(contentId: number, collection: CollectionParameter = null, hierarchy: HierarchyParameter) {
  collection = collection ?? {id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF}
  return setStartedOrCompletedStatus(contentId, collection, false, {isOffline: true, hierarchy})
}

/**
 * @param contentId
 * @param collection - Collection context; defaults to self
 * @param hierarchy - Content hierarchy used to update parent progress offline
 * @param options.skipPush - Skip queuing the reset for server sync (default false)
 */
export async function contentStatusResetOffline(contentId: number, collection: CollectionParameter = null, hierarchy: HierarchyParameter, {skipPush = false} = {}) {
  collection = collection ?? {id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF}
  return resetStatus(contentId, collection, {hierarchy, skipPush})
}


