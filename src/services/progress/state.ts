import { db } from '../sync'
import { COLLECTION_TYPE, CollectionParameter } from '../sync/models/ContentProgress'
import { getById, getByIds, getByRecordIds } from './internal/queries'

export const state = async (contentId: number, collection?: CollectionParameter) =>
  getById(contentId, 'state', '', collection)

export const stateByIds = async (contentIds: number[], collection?: CollectionParameter) =>
  getByIds(contentIds, 'state', '', collection)

export const stateByRecordIds = async (ids: string[]) => getByRecordIds(ids, 'state', '')

export const playbackPositionByIds = async (contentIds: number[], collection?: CollectionParameter) =>
  getByIds(contentIds, 'resume_time_seconds', 0, collection)

export const playbackPositionByRecordIds = async (ids: string[]) =>
  getByRecordIds(ids, 'resume_time_seconds', 0)

export const lastInteractedOf = (
  contentIds: number[],
  collection?: CollectionParameter
): Promise<number | undefined> =>
  db.contentProgress
    .mostRecentlyUpdatedId(contentIds, collection)
    .then((r) => (r.data ? parseInt(r.data, 10) : undefined))

export const incompleteLesson = (
  progressOnItems: Map<number, string>,
  contentType: string,
  currentContentId?: number
): number | null | undefined => {
  const ids = Array.from(progressOnItems.keys())
  const getProgress = (id: number) => progressOnItems.get(id)

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
