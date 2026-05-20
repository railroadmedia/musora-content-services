import { db } from '../../sync'
import ContentProgress, { CollectionParameter } from '../../sync/models/ContentProgress'
import type { ModelSerialized } from '../../sync/serializers'

type Selector<V> = (p: ModelSerialized<ContentProgress>) => V | null | undefined

export const getByIds = async <V>(
  contentIds: number[],
  select: Selector<V>,
  fallback: V,
  collection?: CollectionParameter
): Promise<Map<number, V>> => {
  if (contentIds.length === 0) return new Map()

  const progress = new Map(contentIds.map((id) => [id, fallback]))
  await db.contentProgress.getSomeProgressByContentIds(contentIds, collection).then((r) => {
    r.data.forEach((p) => {
      progress.set(p.content_id, select(p) ?? fallback)
    })
  })
  return progress
}

export const getById = async <V>(
  contentId: number,
  select: Selector<V>,
  fallback: V,
  collection?: CollectionParameter
): Promise<V> => {
  if (!contentId) return fallback
  return db.contentProgress
    .getOneProgressByContentId(contentId, collection)
    .then((r) => (r.data ? select(r.data) ?? fallback : fallback))
}

export const getByRecordIds = async <V>(
  ids: string[],
  select: Selector<V>,
  fallback: V
): Promise<Record<string, V>> => {
  const progress = Object.fromEntries(ids.map((id) => [id, fallback]))

  await db.contentProgress.getSomeProgressByRecordIds(ids).then((r) => {
    r.data.forEach((p) => {
      progress[p.id] = select(p) ?? fallback
    })
  })

  return progress
}
