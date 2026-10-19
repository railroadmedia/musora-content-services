import { COLLECTION_ID_SELF, COLLECTION_TYPE } from './sync/models/ContentProgress'

const excludeFromGeneratedIndex = ['getHierarchyWithSessionCache', 'getHierarchiesWithSessionCache']

const IDLE_REFETCH_MS = 30 * 60 * 1000

interface Hierarchy {
  topLevelId: number
  parents: Record<number, number | null>
  children: Record<number, number[]>
  metadata: Record<number, object>
}

interface CollectionKeyParameter {
  type?: string
  id?: number | string
}

interface SessionEntry {
  contentId: number
  collectionKey: string
  hierarchy: Hierarchy
  lastUsedAt: number
}

let sessionEntry: SessionEntry | null = null

// Same normalisation as ContentProgress.generateId, without its validators, so a lookup can't throw on its key.
function toCollectionKey(collection?: CollectionKeyParameter | null): string {
  return `${collection?.type || COLLECTION_TYPE.SELF}:${collection?.id || COLLECTION_ID_SELF}`
}

function isIdle(entry: SessionEntry): boolean {
  return Date.now() - entry.lastUsedAt > IDLE_REFETCH_MS
}

function useEntry(entry: SessionEntry): Hierarchy {
  entry.lastUsedAt = Date.now()
  return entry.hierarchy
}

export async function getHierarchyWithSessionCache(
  contentId: number | string,
  collection: CollectionKeyParameter | null | undefined,
  fetchHierarchy: () => Promise<Hierarchy | null>
): Promise<Hierarchy | null> {
  const normalizedContentId = Number(contentId)
  const collectionKey = toCollectionKey(collection)
  const entry =
    sessionEntry?.contentId === normalizedContentId && sessionEntry.collectionKey === collectionKey
      ? sessionEntry
      : null

  if (entry && !isIdle(entry)) return useEntry(entry)
  sessionEntry = entry

  let hierarchy: Hierarchy | null
  try {
    hierarchy = await fetchHierarchy()
  } catch {
    return entry ? useEntry(entry) : null
  }

  sessionEntry = hierarchy
    ? { contentId: normalizedContentId, collectionKey, hierarchy, lastUsedAt: Date.now() }
    : null
  return hierarchy
}

export async function getHierarchiesWithSessionCache(
  contentIds: Array<number | string>,
  collection: CollectionKeyParameter | null | undefined,
  fetchHierarchies: () => Promise<Record<number, Hierarchy> | null>
): Promise<Record<number, Hierarchy> | null> {
  const entry =
    sessionEntry?.collectionKey === toCollectionKey(collection) &&
    contentIds.every((contentId) => Number(contentId) in sessionEntry!.hierarchy.parents)
      ? sessionEntry
      : null
  const fromEntry = (coveringEntry: SessionEntry) => {
    const hierarchy = useEntry(coveringEntry)
    return Object.fromEntries(contentIds.map((contentId) => [contentId, hierarchy]))
  }

  if (entry && !isIdle(entry)) return fromEntry(entry)

  try {
    return await fetchHierarchies()
  } catch {
    return entry ? fromEntry(entry) : null
  }
}
