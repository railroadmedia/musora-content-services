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

export async function recordWatchSessionOffline(
  contentId: number,
  mediaLengthSeconds: number,
  currentSeconds: number,
  secondsPlayed: number,
  hierarchy: HierarchyParameter,
  {
    collection = null,
    prevSession = null,
    instrumentId = null,
    categoryId = null,
  }: {
    collection?: CollectionParameter|null,
    prevSession?: string|null,
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
      prevSession,
      instrumentId,
      categoryId,
      isOffline: true,
      hierarchy,
    })
}

export async function contentStatusCompletedOffline(contentId: number, collection: CollectionParameter = null, hierarchy: HierarchyParameter) {
  collection = collection ?? {id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF}
  return setStartedOrCompletedStatus(contentId, collection, true, {isOffline: true, hierarchy})
}

export async function contentStatusCompletedManyOffline(contentIds: number[], collection: CollectionParameter = null, hierarchy: HierarchyParameter) {
  collection = collection ?? {id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF}
  return setStartedOrCompletedStatusMany(contentIds, collection, true, {isOffline: true, hierarchy})
}

export async function contentStatusStartedOffline(contentId: number, collection: CollectionParameter = null, hierarchy: HierarchyParameter) {
  collection = collection ?? {id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF}
  return setStartedOrCompletedStatus(contentId, collection, false, {isOffline: true, hierarchy})
}

export async function contentStatusResetOffline(contentId: number, collection: CollectionParameter = null, hierarchy: HierarchyParameter, {skipPush = false} = {}) {
  collection = collection ?? {id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF}
  return resetStatus(contentId, collection, {hierarchy, skipPush})
}


