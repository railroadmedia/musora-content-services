import { db } from '../sync'
import { COLLECTION_TYPE, CollectionParameter } from '../sync/models/ContentProgress'

const SIXTY_DAYS_IN_SECONDS = 60 * 24 * 60 * 60

export const getProgressState = async (contentId: number, collection?: CollectionParameter) => {
  return getById(contentId, collection, 'state', '')
}

export const getProgressStateByIds = async (
  contentIds: number[],
  collection?: CollectionParameter
) => getByIds(contentIds, collection, 'state', '')

export const getProgressStateByRecordIds = async (ids: string[]) => getByRecordIds(ids, 'state', '')

export const getResumeTimeSecondsByIds = async (contentIds: number[], collection = null) =>
  getByIds(contentIds, collection, 'resume_time_seconds', 0)

export const getLastInteractedOf = (
  contentIds: number[],
  collection?: CollectionParameter
): Promise<number | undefined> =>
  db.contentProgress
    .mostRecentlyUpdatedId(contentIds, collection)
    .then((r) => (r.data ? parseInt(r.data, 10) : undefined))

export const findIncompleteLesson = (
  progressOnItems: Map<number, string>,
  currentContentId: number | undefined,
  contentType: string
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

export interface GetAllQueryOptions {
  onlyIds?: boolean
  include?: {
    aLaCarte?: boolean
    learningPaths?: boolean
  }
}

const defaultQueryOptions: GetAllQueryOptions = {
  onlyIds: true,
  include: {
    aLaCarte: true,
    learningPaths: false,
  },
}

export interface QueryMetadata {
  brand?: string
  contentTypes?: string[]
  parentId?: number
}

export const getAllStarted = async (limit = null, options?: GetAllQueryOptions) =>
  db.contentProgress.started(limit, options ?? defaultQueryOptions)

export const getAllCompleted = async (limit = null, options?: GetAllQueryOptions) =>
  db.contentProgress.completed(limit, options ?? defaultQueryOptions)

export const getAllCompletedByIds = async (contentIds: number[]) =>
  db.contentProgress.completedByContentIds(contentIds)

export interface StartedOrCompletedOptions extends QueryMetadata {
  include?: GetAllQueryOptions['include']
}

export const getAllStartedOrCompleted = async (
  limit?: number,
  options: StartedOrCompletedOptions = {}
) =>
  db.contentProgress
    .startedOrCompleted({
      ...options,
      limit,
      updatedAfter: Math.floor(Date.now() / 1000) - SIXTY_DAYS_IN_SECONDS,
    })
    .then((r) => r.data)

const getByIds = async <V>(
  contentIds: number[],
  collection: CollectionParameter,
  dataKey: string,
  defaultValue: V
): Promise<Map<number, V>> => {
  if (contentIds.length === 0) return new Map()

  const progress = new Map(contentIds.map((id) => [id, defaultValue]))
  await db.contentProgress.getSomeProgressByContentIds(contentIds, collection).then((r) => {
    r.data.forEach((p) => {
      progress.set(p.content_id, p[dataKey] ?? defaultValue)
    })
  })
  return progress
}

const getById = async <V>(
  contentId: number,
  collection: CollectionParameter,
  dataKey: string,
  defaultValue: V
): Promise<V> => {
  if (!contentId) return defaultValue
  return db.contentProgress
    .getOneProgressByContentId(contentId, collection)
    .then((r) => r.data?.[dataKey] ?? defaultValue)
}

const getByRecordIds = async <V>(ids: string[], dataKey: string, defaultValue: V) => {
  const progress = Object.fromEntries(ids.map((id) => [id, defaultValue]))

  await db.contentProgress.getSomeProgressByRecordIds(ids).then((r) => {
    r.data.forEach((p) => {
      progress[p.id] = p[dataKey] ?? defaultValue
    })
  })

  return progress
}
