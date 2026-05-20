import { db } from '../sync'
import ContentProgress, {
  COLLECTION_TYPE,
  CollectionParameter,
  STATE,
} from '../sync/models/ContentProgress'
import type { ModelSerialized } from '../sync/serializers'
import { getById, getByIds, getByRecordIds } from './internal/queries'
import type { ProgressSnapshot } from './types'

type Selector<V> = (p: ModelSerialized<ContentProgress>) => V | null | undefined

const queryById =
  <V>(select: Selector<V>, fallback: V) =>
  (contentId: number, collection?: CollectionParameter) =>
    getById(contentId, select, fallback, collection)

const queryByIds =
  <V>(select: Selector<V>, fallback: V) =>
  (contentIds: number[], collection?: CollectionParameter) =>
    getByIds(contentIds, select, fallback, collection)

const queryByRecordIds =
  <V>(select: Selector<V>, fallback: V) =>
  (ids: string[]) =>
    getByRecordIds(ids, select, fallback)

type StateValue = STATE | ''

export const state = queryById<StateValue>((p) => p.state, '')
export const stateByIds = queryByIds<StateValue>((p) => p.state, '')
export const stateByRecordIds = queryByRecordIds<StateValue>((p) => p.state, '')

export const playbackPositionByIds = queryByIds<number>((p) => p.resume_time_seconds, 0)
export const playbackPositionByRecordIds = queryByRecordIds<number>(
  (p) => p.resume_time_seconds,
  0
)

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

const emptySnapshot = (): ProgressSnapshot => ({ last_update: 0, progress: 0, status: '' })

const buildSnapshotMap = async <K extends string | number>(
  ids: K[],
  fetch: () => Promise<{ data: ModelSerialized<ContentProgress>[] }>,
  keyOf: (p: ModelSerialized<ContentProgress>) => K,
  toSnapshot: (p: ModelSerialized<ContentProgress>) => ProgressSnapshot
): Promise<Record<K, ProgressSnapshot>> => {
  const result = Object.fromEntries(ids.map((id) => [id, emptySnapshot()])) as Record<
    K,
    ProgressSnapshot
  >

  const { data } = await fetch()
  data.forEach((p) => {
    result[keyOf(p)] = toSnapshot(p)
  })

  return result
}

export const snapshotByIds = (
  contentIds: number[],
  collection?: CollectionParameter
): Promise<Record<number, ProgressSnapshot>> =>
  buildSnapshotMap(
    contentIds,
    () => db.contentProgress.getSomeProgressByContentIds(contentIds, collection),
    (p) => p.content_id,
    (p) => ({
      last_update: p.last_interacted_a_la_carte,
      progress: p.progress_percent,
      status: p.state,
    })
  )

export const snapshotByRecordIds = (
  ids: string[]
): Promise<Record<string, ProgressSnapshot>> =>
  buildSnapshotMap(
    ids,
    () => db.contentProgress.getSomeProgressByRecordIds(ids),
    (p) => p.id,
    (p) => ({
      last_update: p.updated_at,
      progress: p.progress_percent,
      status: p.state,
    })
  )

export const methodAccessedIds = async (contentIds: number[]): Promise<number[]> =>
  db.contentProgress
    .getSomeProgressWhereLastAccessedFromMethod(contentIds)
    .then((r) => r.data.map((record) => record.content_id))
