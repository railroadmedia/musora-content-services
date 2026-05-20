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
  if (currentIndex === -1) return null

  for (let i = currentIndex + 1; i < ids.length; i++) {
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
): Promise<Record<number, ProgressSnapshot>> => {
  const result = Object.fromEntries(
    contentIds.map((id) => [id, { last_update: 0, progress: 0, status: '' }])
  ) as Record<number, ProgressSnapshot>

  await db.contentProgress.getSomeProgressByContentIds(contentIds, collection).then((r) => {
    r.data.forEach((p) => {
      result[p.content_id] = {
        last_update: p.last_interacted_a_la_carte,
        progress: p.progress_percent,
        status: p.state,
      }
    })
  })

  return result
}

export const snapshotByRecordIds = async (
  ids: string[]
): Promise<Record<string, ProgressSnapshot>> => {
  const result = Object.fromEntries(
    ids.map((id) => [id, { last_update: 0, progress: 0, status: '' }])
  ) as Record<string, ProgressSnapshot>

  await db.contentProgress.getSomeProgressByRecordIds(ids).then((r) => {
    r.data.forEach((p) => {
      result[p.id] = {
        last_update: p.updated_at,
        progress: p.progress_percent,
        status: p.state,
      }
    })
  })

  return result
}

export const methodAccessedIds = async (contentIds: number[]): Promise<number[]> =>
  db.contentProgress
    .getSomeProgressWhereLastAccessedFromMethod(contentIds)
    .then((r) => r.data.map((record) => record.content_id))
