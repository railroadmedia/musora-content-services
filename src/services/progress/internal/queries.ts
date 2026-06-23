import { db } from '../../sync'
import { CollectionParameter } from '../../sync/models/ContentProgress'

export const getByIds = async <V>(
  contentIds: number[],
  dataKey: string,
  defaultValue: V,
  collection?: CollectionParameter
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

export const getById = async <V>(
  contentId: number,
  dataKey: string,
  defaultValue: V,
  collection?: CollectionParameter
): Promise<V> => {
  if (!contentId) return defaultValue
  return db.contentProgress
    .getOneProgressByContentId(contentId, collection)
    .then((r) => r.data?.[dataKey] ?? defaultValue)
}

export const getByRecordIds = async <V>(ids: string[], dataKey: string, defaultValue: V) => {
  const progress = Object.fromEntries(ids.map((id) => [id, defaultValue]))

  await db.contentProgress.getSomeProgressByRecordIds(ids).then((r) => {
    r.data.forEach((p) => {
      progress[p.id] = p[dataKey] ?? defaultValue
    })
  })

  return progress
}
