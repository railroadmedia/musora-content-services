import { db } from '../sync'
import {
  COLLECTION_ID_SELF,
  COLLECTION_TYPE,
  CollectionParameter,
} from '../sync/models/ContentProgress'
import { getHierarchies, getHierarchy } from '../sanity.js'
import { onLearningPathCompletedActions } from '../content-org/learning-paths'
import { duplicateProgressToALaCarteOffline } from '../offline/progress'
import {
  bubbleAndTrickleProgressesSafely,
  computeBubbleTrickleProgresses,
  filterOutNegativeProgress,
} from './internal/bubble'
import { filterOutLearningPathsForDuplication } from './internal/learning-path'
import { snapshotByIds } from './state'
import type { Hierarchy, ProgressMetadata } from './types'

const SELF: CollectionParameter = { id: COLLECTION_ID_SELF, type: COLLECTION_TYPE.SELF }

const withDefaultCollection = (collection?: CollectionParameter): CollectionParameter =>
  collection ?? SELF

const isPlaylistCollection = (collection: CollectionParameter): boolean =>
  collection.type === COLLECTION_TYPE.PLAYLIST

export interface SaveOptions {
  isOffline?: boolean
  hierarchy?: Hierarchy | null
  skipPush?: boolean
  accessedDirectly?: boolean
}

export interface SetStatusOptions {
  skipPush?: boolean
  skipBubbleTrickle?: boolean
}

export interface ResetOptions {
  skipPush?: boolean
}

const requestPush = (skipPush: boolean, reason: string): void => {
  if (!skipPush) db.contentProgress.requestPushUnsynced(reason)
}

export const save = async (
  contentId: number,
  progress: number,
  collection?: CollectionParameter,
  currentSeconds?: number,
  {
    isOffline = false,
    hierarchy = null,
    skipPush = false,
    accessedDirectly = true,
  }: SaveOptions = {}
) => {
  const activeCollection = withDefaultCollection(collection)
  const isPlaylist = isPlaylistCollection(activeCollection)

  let progresses: Record<number, number> = { [contentId]: progress }

  const existingProgress = await snapshotByIds([contentId], activeCollection)
  progresses = filterOutNegativeProgress(progresses, existingProgress)
  if (Object.keys(progresses).length === 0) return

  if (!isOffline) {
    hierarchy = (await getHierarchy(contentId, activeCollection)) as Hierarchy | null
  }
  const metadata = hierarchy?.metadata ?? {}

  if (isPlaylist) {
    if (isOffline) {
      await duplicateProgressToALaCarteOffline(
        progresses as Record<string, number>,
        metadata as Record<string, ProgressMetadata>,
        activeCollection
      )
    } else {
      await duplicateProgressToALaCarte(progresses, activeCollection)
    }
    requestPush(skipPush, 'save-content-progress')
    return
  }

  const response = await db.contentProgress.recordProgress(
    contentId,
    activeCollection,
    progress,
    metadata[contentId],
    currentSeconds ?? undefined,
    { skipPush: true, accessedDirectly }
  )

  if (isOffline) {
    await duplicateProgressToALaCarteOffline(
      progresses as Record<string, number>,
      metadata as Record<string, ProgressMetadata>,
      activeCollection
    )
    requestPush(skipPush, 'save-content-progress')
    return response
  }

  let bubbled = await computeBubbleTrickleProgresses(
    contentId,
    progress,
    hierarchy as Hierarchy,
    activeCollection,
    { trickle: false }
  )
  Object.assign(progresses, bubbled)

  const existing = await snapshotByIds(Object.keys(bubbled).map(Number), activeCollection)
  bubbled = filterOutNegativeProgress(bubbled, existing)

  await bubbleAndTrickleProgressesSafely(bubbled, metadata, { accessedDirectly }, activeCollection)

  await handleLearningPathProgressActions(progresses, activeCollection)

  requestPush(skipPush, 'save-content-progress')

  return response
}

export const setStatus = async (
  contentId: number,
  isCompleted: boolean,
  collection?: CollectionParameter,
  { skipPush = false, skipBubbleTrickle = false }: SetStatusOptions = {}
) => {
  const activeCollection = withDefaultCollection(collection)
  const isPlaylist = isPlaylistCollection(activeCollection)

  const hierarchy = (await getHierarchy(contentId, activeCollection)) as Hierarchy | null
  const metadata = hierarchy?.metadata ?? {}

  const progress = isCompleted ? 100 : 0
  const progresses: Record<number, number> = { [contentId]: progress }

  if (isPlaylist) {
    await duplicateProgressToALaCarte(progresses, activeCollection)
    requestPush(skipPush, 'set-started-or-completed-status')
    return
  }

  const response = await db.contentProgress.recordProgress(
    contentId,
    activeCollection,
    progress,
    metadata[contentId],
    undefined,
    { skipPush: true }
  )

  if (!skipBubbleTrickle) {
    const bubbled = await computeBubbleTrickleProgresses(
      contentId,
      progress,
      hierarchy as Hierarchy,
      activeCollection
    )
    Object.assign(progresses, bubbled)
    await bubbleAndTrickleProgressesSafely(bubbled, metadata, undefined, activeCollection)
  }

  await handleLearningPathProgressActions(progresses, activeCollection)

  requestPush(skipPush, 'set-started-or-completed-status')

  return response
}

export const setStatusMany = async (
  contentIds: number[],
  isCompleted: boolean,
  collection?: CollectionParameter,
  { skipPush = false }: ResetOptions = {}
) => {
  const activeCollection = withDefaultCollection(collection)
  const isPlaylist = isPlaylistCollection(activeCollection)

  const hierarchies = ((await getHierarchies(contentIds, activeCollection)) ?? {}) as Record<
    number,
    Hierarchy
  >
  const metadata: Record<number, ProgressMetadata> = Object.assign(
    {},
    ...Object.values(hierarchies).map((h) => h.metadata ?? {})
  )

  const progress = isCompleted ? 100 : 0
  const progresses: Record<number, number> = Object.fromEntries(
    contentIds.map((id) => [id, progress])
  )

  if (isPlaylist) {
    await duplicateProgressToALaCarte(progresses, activeCollection)
    requestPush(skipPush, 'set-started-or-completed-status-many')
    return
  }

  const response = await db.contentProgress.recordProgressMany(
    progresses as Record<string, number>,
    activeCollection,
    metadata as Record<string, ProgressMetadata>,
    { skipPush: true }
  )

  let bubbled: Record<number, number> = {}
  for (const contentId of contentIds) {
    bubbled = {
      ...bubbled,
      ...(await computeBubbleTrickleProgresses(
        contentId,
        progress,
        hierarchies[contentId],
        activeCollection
      )),
    }
  }
  Object.assign(progresses, bubbled)

  await bubbleAndTrickleProgressesSafely(bubbled, metadata, undefined, activeCollection)
  await handleLearningPathProgressActions(progresses, activeCollection)

  requestPush(skipPush, 'set-started-or-completed-status-many')

  return response
}

export const markCompleted = (contentId: number, collection?: CollectionParameter) =>
  setStatus(contentId, true, withDefaultCollection(collection))

export const markCompletedMany = (contentIds: number[], collection?: CollectionParameter) =>
  setStatusMany(contentIds, true, withDefaultCollection(collection))

export const markStarted = (
  contentId: number,
  collection?: CollectionParameter,
  { skipPush = false, skipBubbleTrickle = false }: SetStatusOptions = {}
) => setStatus(contentId, false, withDefaultCollection(collection), { skipPush, skipBubbleTrickle })

export const reset = (
  contentId: number,
  collection?: CollectionParameter,
  { skipPush = false }: ResetOptions = {}
) => resetStatus(contentId, withDefaultCollection(collection), { skipPush })

const resetStatus = async (
  contentId: number,
  collection: CollectionParameter,
  { skipPush = false }: ResetOptions = {}
) => {
  const progress = 0
  const response = await db.contentProgress.eraseProgress(contentId, collection, { skipPush: true })

  const progresses: Record<number, number> = { [contentId]: progress }

  const hierarchy = (await getHierarchy(contentId, collection)) as Hierarchy | null
  const metadata = hierarchy?.metadata ?? {}

  const bubbled = await computeBubbleTrickleProgresses(
    contentId,
    progress,
    hierarchy as Hierarchy,
    collection
  )
  Object.assign(progresses, bubbled)

  await bubbleAndTrickleProgressesSafely(bubbled, metadata, { isResetAction: true }, collection)

  await handleLearningPathProgressActions(progresses, collection)

  requestPush(skipPush, 'reset-status')

  return response
}

const handleLearningPathProgressActions = async (
  progresses: Record<number, number>,
  collection: CollectionParameter
): Promise<void> => {
  if (collection.type !== COLLECTION_TYPE.LEARNING_PATH) return

  await duplicateProgressToALaCarte(progresses, collection)

  for (const [id, prog] of Object.entries(progresses)) {
    if (prog === 100 && Number(id) === collection.id) {
      await onLearningPathCompletedActions(Number(id))
    }
  }
}

const duplicateProgressToALaCarte = async (
  progresses: Record<number, number>,
  collection: CollectionParameter
): Promise<void> => {
  let filtered = filterOutLearningPathsForDuplication(progresses, collection)
  const externalProgresses = await snapshotByIds(Object.keys(filtered).map(Number))
  filtered = filterOutNegativeProgress(filtered, externalProgresses)
  await duplicateProgressForIds(filtered)
}

const duplicateProgressForIds = async (entries: Record<number, number>): Promise<unknown[]> =>
  Promise.all(
    Object.entries(entries).map(([id, pct]) =>
      save(parseInt(id, 10), pct, undefined, undefined, {
        skipPush: true,
        accessedDirectly: false,
      })
    )
  )
