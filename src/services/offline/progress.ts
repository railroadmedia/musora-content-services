import {
  _recordWatchSession,
  normalizeCollection,
  normalizeContentId,
  filterOutLearningPathsForDuplication,
  filterOutNegativeProgress,
  getProgressDataByIds,
} from '../../services/contentProgress'
import { COLLECTION_ID_SELF, COLLECTION_TYPE, CollectionParameter } from '../sync/models/ContentProgress'
import { db } from '../../services/sync'

const excludeFromGeneratedIndex = [
  'duplicateProgressToALaCarteOffline',
]

interface HierarchyParameter {
  topLevelId: number
  parents: Record<string, number>
  children: Record<string, number[]>
  metadata: Record<string, MetadataParameter>
}

interface MetadataParameter {
  brand: string
  parent_id: number
  type: string
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
    collection?: CollectionParameter | null,
    instrumentId?: number | null,
    categoryId?: number | null
  } = {},
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
  collection = collection ?? { id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF }
  return setStartedOrCompletedStatusOffline(contentId, collection, true, hierarchy)
}

/**
 * @param contentIds
 * @param collection - Collection context; defaults to self
 * @param hierarchy - Content hierarchy used to update parent progress offline
 */
export async function contentStatusCompletedManyOffline(contentIds: number[], collection: CollectionParameter = null, hierarchy: HierarchyParameter) {
  collection = collection ?? { id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF }
  return setStartedOrCompletedStatusManyOffline(contentIds, collection, true, hierarchy)
}

/**
 * @param contentId
 * @param collection - Collection context; defaults to self
 * @param hierarchy - Content hierarchy used to update parent progress offline
 */
export async function contentStatusStartedOffline(contentId: number, collection: CollectionParameter = null, hierarchy: HierarchyParameter) {
  collection = collection ?? { id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF }
  return setStartedOrCompletedStatusOffline(contentId, collection, false, hierarchy)
}

/**
 * @param contentId
 * @param collection - Collection context; defaults to self
 */
export async function contentStatusResetOffline(contentId: number, collection: CollectionParameter = null) {
  collection = collection ?? { id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF }
  return resetStatusOffline(contentId, collection)
}

async function setStartedOrCompletedStatusOffline(contentId: number, collection: CollectionParameter, isCompleted: boolean, hierarchy: HierarchyParameter) {
  const metadata = hierarchy.metadata || {}

  const progress = isCompleted ? 100 : 0
  const response = await db.contentProgress.recordProgress(
    normalizeContentId(contentId),
    normalizeCollection(collection),
    progress,
    metadata[contentId],
    null,
    { skipPush: true },
  )

  let allProgresses = { [contentId]: progress }

  if (collection?.type === COLLECTION_TYPE.LEARNING_PATH) {
    await duplicateProgressToALaCarteOffline(allProgresses, metadata, collection)
  }

  db.contentProgress.requestPushUnsynced('save-content-progress')
  return response
}

async function setStartedOrCompletedStatusManyOffline(contentIds: number[], collection: CollectionParameter, isCompleted: boolean, hierarchy: HierarchyParameter) {
  const metadata = hierarchy.metadata || {}

  const progress = isCompleted ? 100 : 0
  let allProgresses = Object.fromEntries(contentIds.map(id => [id, progress]))

  const response = await db.contentProgress.recordProgressMany(
    allProgresses,
    normalizeCollection(collection),
    metadata,
    { skipPush: true },
  )

  if (collection?.type === COLLECTION_TYPE.LEARNING_PATH) {
    await duplicateProgressToALaCarteOffline(allProgresses, metadata, collection)
  }

  db.contentProgress.requestPushUnsynced('save-content-progress')
  return response
}

async function resetStatusOffline(contentId: number, collection: CollectionParameter = null) {
  contentId = normalizeContentId(contentId)
  collection = normalizeCollection(collection)

  const progress = 0
  const response = await db.contentProgress.eraseProgress(contentId, collection, { skipPush: true })

  let allProgresses = {}
  allProgresses[contentId] = progress

  db.contentProgress.requestPushUnsynced('reset-status')
  return response
}

// todo: move getters and helper functions into separate file to unwind circular dependencies with ofline/progress.ts
export async function duplicateProgressToALaCarteOffline(progresses: Record<string, number>, metadata: Record<string, MetadataParameter>, collection: CollectionParameter) {
  let filteredProgresses = filterOutLearningPathsForDuplication(progresses, collection)

  const externalProgresses = await getProgressDataByIds(Object.keys(filteredProgresses), null)

  filteredProgresses = filterOutNegativeProgress(filteredProgresses, externalProgresses)

  await db.contentProgress.recordProgressMany(
    filteredProgresses,
    null,
    metadata,
    { skipPush: true },
  )
}
