import { db } from '../sync'
import type { ModelSerialized } from '../sync/serializers'
import ContentProgress, { COLLECTION_TYPE, CollectionParameter } from '../sync/models/ContentProgress'
import { queryById, queryByIds, queryByRecordIds } from './internal/queries'
import type { ProgressSnapshot } from './types'

const buildSnapshotMap = <K extends string | number>(
  ids: K[],
  records: ModelSerialized<ContentProgress>[],
  keyOf: (p: ModelSerialized<ContentProgress>) => K,
  lastUpdateOf: (p: ModelSerialized<ContentProgress>) => number
): Map<K, ProgressSnapshot> => {
  const overrides = new Map(
    records.map((p) => [
      keyOf(p),
      { last_update: lastUpdateOf(p), progress: p.progress_percent, status: p.state as string },
    ])
  )
  return new Map(
    ids.map((id) => [id, overrides.get(id) ?? { last_update: 0, progress: 0, status: '' }])
  )
}

export const state = queryById((p) => p.state as string, '')
export const stateByIds = queryByIds((p) => p.state as string, '')
export const stateByRecordIds = queryByRecordIds((p) => p.state as string, '')

export const playbackPositionByIds = queryByIds((p) => p.resume_time_seconds ?? 0, 0)
export const playbackPositionByRecordIds = queryByRecordIds((p) => p.resume_time_seconds ?? 0, 0)

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
  const startIndex = currentIndex === -1 ? 0 : currentIndex + 1

  for (let i = startIndex; i < ids.length; i++) {
    const id = ids[i]
    if (getProgress(id) !== 'completed') {
      return id
    }
  }

  return ids[0]
}

export const snapshotByIds = async (
  contentIds: number[],
  collection?: CollectionParameter
): Promise<Map<number, ProgressSnapshot>> =>
  db.contentProgress
    .getSomeProgressByContentIds(contentIds, collection)
    .then((r) => buildSnapshotMap(contentIds, r.data, (p) => p.content_id, (p) => p.last_interacted_a_la_carte))

export const snapshotByRecordIds = async (
  ids: string[]
): Promise<Record<string, ProgressSnapshot>> =>
  db.contentProgress
    .getSomeProgressByRecordIds(ids)
    .then((r) => Object.fromEntries(buildSnapshotMap(ids, r.data, (p) => p.id, (p) => p.updated_at)))

export const methodAccessedIds = async (contentIds: number[]): Promise<number[]> =>
  db.contentProgress
    .getSomeProgressWhereLastAccessedFromMethod(contentIds)
    .then((r) => r.data.map((record) => record.content_id))
