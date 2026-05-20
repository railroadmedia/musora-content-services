import { db } from '../../sync'
import { CollectionParameter } from '../../sync/models/ContentProgress'
import type { Hierarchy, ProgressMetadata, ProgressSnapshot } from '../types'
import { getByIds } from './queries'

const MAX_DEPTH = 3

export const filterOutNegativeProgress = (
  progresses: Record<number, number>,
  existingProgresses: Record<number, ProgressSnapshot>
): Record<number, number> =>
  Object.fromEntries(
    Object.entries(progresses).filter(
      ([id, progress]) => progress >= (existingProgresses[Number(id)]?.progress ?? 0)
    )
  )

export const getChildrenToDepth = (parentId: number, hierarchy: Hierarchy, depth = 1): number[] => {
  const childIds = hierarchy.children[parentId] ?? []
  let allChildrenIds: number[] = [...childIds]
  childIds.forEach((id) => {
    allChildrenIds = allChildrenIds.concat(getChildrenToDepth(id, hierarchy, depth - 1))
  })
  return allChildrenIds
}

export const getAncestorAndSiblingIds = (
  hierarchy: Hierarchy,
  contentId: number,
  depth = 1
): number[] => {
  if (depth > MAX_DEPTH) return []

  const parentId = hierarchy?.parents?.[contentId]
  if (!parentId) return []

  if (parentId === contentId) {
    console.error('Circular dependency detected for contentId', contentId)
    return []
  }

  const siblingIds = hierarchy?.children?.[parentId] ?? []
  const allIds = [
    ...siblingIds,
    parentId,
    ...getAncestorAndSiblingIds(hierarchy, parentId, depth + 1),
  ]
  return [...new Set(allIds)]
}

export const averageProgressesFor = (
  hierarchy: Hierarchy,
  contentId: number,
  progressData: Map<number, number>,
  depth = 1
): Record<number, number> => {
  if (depth > MAX_DEPTH) return {}

  const parentId = hierarchy?.parents?.[contentId]
  if (!parentId) return {}

  const parentChildProgress =
    hierarchy?.children?.[parentId]?.map((childId) => progressData.get(childId) ?? 0) ?? []

  const avgParentProgress =
    parentChildProgress.length > 0
      ? Math.round(parentChildProgress.reduce((a, b) => a + b, 0) / parentChildProgress.length)
      : 0

  return {
    ...averageProgressesFor(hierarchy, parentId, progressData, depth + 1),
    [parentId]: avgParentProgress,
  }
}

export const trickleProgress = (
  hierarchy: Hierarchy,
  contentId: number,
  progress: number
): Record<number, number> => {
  const descendantIds = getChildrenToDepth(contentId, hierarchy, MAX_DEPTH)
  return Object.fromEntries(descendantIds.map((id) => [id, progress]))
}

export const bubbleProgress = async (
  hierarchy: Hierarchy,
  contentId: number,
  collection?: CollectionParameter
): Promise<Record<number, number>> => {
  const ids = getAncestorAndSiblingIds(hierarchy, contentId)
  const progresses = await getByIds(ids, (p) => p.progress_percent, 0, collection)
  return averageProgressesFor(hierarchy, contentId, progresses)
}

export const computeBubbleTrickleProgresses = async (
  contentId: number,
  progress: number,
  hierarchy: Hierarchy,
  collection?: CollectionParameter,
  { bubble = true, trickle = true }: { bubble?: boolean; trickle?: boolean } = {}
): Promise<Record<number, number>> => ({
  ...(trickle ? trickleProgress(hierarchy, contentId, progress) : {}),
  ...(bubble ? await bubbleProgress(hierarchy, contentId, collection) : {}),
})

export interface BubbleAndTrickleOptions {
  isResetAction?: boolean
  accessedDirectly?: boolean
}

export const bubbleAndTrickleProgressesSafely = async (
  progresses: Record<number, number>,
  metadata: Record<number, ProgressMetadata>,
  options: BubbleAndTrickleOptions = {},
  collection?: CollectionParameter
): Promise<void> => {
  let eraseProgresses: Record<number, number> = {}
  let activeProgresses = progresses

  if (options.isResetAction) {
    eraseProgresses = Object.fromEntries(
      Object.entries(progresses).filter(([, pct]) => pct === 0)
    ) as Record<number, number>
    activeProgresses = Object.fromEntries(
      Object.entries(progresses).filter(([, pct]) => pct > 0)
    ) as Record<number, number>
  }

  if (Object.keys(activeProgresses).length > 0) {
    await db.contentProgress.recordProgressMany(activeProgresses, collection, metadata, {
      skipPush: true,
      accessedDirectly: options.accessedDirectly,
      allowRegression: true,
    })
  }

  if (Object.keys(eraseProgresses).length > 0) {
    const eraseIds = Object.keys(eraseProgresses).map(Number)
    await db.contentProgress.eraseProgressMany(eraseIds, collection, { skipPush: true })
  }
}
