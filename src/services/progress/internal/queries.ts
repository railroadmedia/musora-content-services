import { db } from '../../sync'
import type { ModelSerialized } from '../../sync/serializers'
import ContentProgress, { CollectionParameter } from '../../sync/models/ContentProgress'

type Selector<V> = (p: ModelSerialized<ContentProgress>) => V | null | undefined

export const getByIds = async <V>(
  contentIds: number[],
  selector: Selector<V>,
  defaultValue: V,
  collection?: CollectionParameter
): Promise<Map<number, V>> => {
  if (contentIds.length === 0) return new Map()

  const progress = new Map(contentIds.map((id) => [id, defaultValue]))
  await db.contentProgress.getSomeProgressByContentIds(contentIds, collection).then((r) => {
    r.data.forEach((p) => {
      progress.set(p.content_id, selector(p) ?? defaultValue)
    })
  })
  return progress
}

export const getById = async <V>(
  contentId: number,
  selector: Selector<V>,
  defaultValue: V,
  collection?: CollectionParameter
): Promise<V> => {
  if (!contentId) return defaultValue
  return db.contentProgress
    .getOneProgressByContentId(contentId, collection)
    .then((r) => (r.data ? selector(r.data) ?? defaultValue : defaultValue))
}

export const getByRecordIds = async <V>(
  ids: string[],
  selector: Selector<V>,
  defaultValue: V
): Promise<Record<string, V>> => {
  const progress = Object.fromEntries(ids.map((id) => [id, defaultValue]))

  await db.contentProgress.getSomeProgressByRecordIds(ids).then((r) => {
    r.data.forEach((p) => {
      progress[p.id] = selector(p) ?? defaultValue
    })
  })

  return progress
}

export const queryById =
  <V>(selector: Selector<V>, defaultValue: V) =>
  (contentId: number, collection?: CollectionParameter) =>
    getById(contentId, selector, defaultValue, collection)

export const queryByIds =
  <V>(selector: Selector<V>, defaultValue: V) =>
  (contentIds: number[], collection?: CollectionParameter) =>
    getByIds(contentIds, selector, defaultValue, collection)

export const queryByRecordIds =
  <V>(selector: Selector<V>, defaultValue: V) =>
  (ids: string[]) =>
    getByRecordIds(ids, selector, defaultValue)
