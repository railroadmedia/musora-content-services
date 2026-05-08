export const mockContentProgressObserver = () => ({
  contentProgressObserver: {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
  },
})

export const mockLearningPaths = () => ({
  getDailySession: jest.fn().mockResolvedValue(null),
  onLearningPathCompletedActions: jest.fn().mockResolvedValue(undefined),
})

export const mockProgressEvents = () => ({
  emitProgressSaved: jest.fn(),
})

export type HierarchyTreeNode = {
  id: number
  type?: string
  brand?: string
  children?: HierarchyTreeNode[]
}

type HierarchyLookups = {
  topLevelId: number
  parents: Record<number, number>
  children: Record<number, number[]>
  metadata: Record<number, { type: string; brand: string; parent_id: number }>
}

const LP_TYPE = 'learning-path-v2'

const ALC_KEY = 'alc'
const LP_KEY = 'lp'

let hierarchiesByKey: Record<string, Record<number, HierarchyLookups>> = {}
let topByKey: Record<string, Record<number, number>> = {}

function keyFor(collection?: { type?: string } | null): string {
  return collection?.type === LP_TYPE ? LP_KEY : ALC_KEY
}

export function setHierarchy(tree: HierarchyTreeNode, options?: { lp?: boolean }) {
  const key = options?.lp ? LP_KEY : ALC_KEY
  hierarchiesByKey[key] ??= {}
  topByKey[key] ??= {}
  hierarchiesByKey[key][tree.id] = treeToLookups(tree)
  registerIds(tree, tree.id, topByKey[key])
}

export function clearHierarchies() {
  hierarchiesByKey = {}
  topByKey = {}
}

function treeToLookups(root: HierarchyTreeNode): HierarchyLookups {
  const parents: Record<number, number> = {}
  const children: Record<number, number[]> = {}
  const metadata: Record<number, { type: string; brand: string; parent_id: number }> = {}

  function walk(node: HierarchyTreeNode, parentId: number) {
    const childIds = (node.children ?? []).map(c => c.id)
    metadata[node.id] = {
      type: node.type ?? 'lesson',
      brand: node.brand ?? 'drumeo',
      parent_id: parentId,
    }
    if (parentId) parents[node.id] = parentId
    if (childIds.length > 0) children[node.id] = childIds
    for (const c of node.children ?? []) walk(c, node.id)
  }
  walk(root, 0)

  return { topLevelId: root.id, parents, children, metadata }
}

function registerIds(node: HierarchyTreeNode, topId: number, target: Record<number, number>) {
  target[node.id] = topId
  for (const c of node.children ?? []) registerIds(c, topId, target)
}

function lookupFor(contentId: number, collection?: any): HierarchyLookups {
  const key = keyFor(collection)
  const tops = topByKey[key] ?? {}
  const hierarchies = hierarchiesByKey[key] ?? {}
  const topId = tops[contentId] ?? (key === LP_KEY ? collection?.id : contentId)
  return hierarchies[topId] ?? {
    topLevelId: contentId,
    parents: {},
    children: {},
    metadata: { [contentId]: { brand: 'drumeo', type: 'lesson', parent_id: 0 } },
  }
}

export const mockSanity = () => ({
  getHierarchy: jest.fn((contentId: number, collection?: any) =>
    Promise.resolve(lookupFor(contentId, collection))
  ),
  getHierarchies: jest.fn((contentIds: number[], collection?: any) =>
    Promise.resolve(Object.fromEntries(contentIds.map(id => [id, lookupFor(id, collection)])))
  ),
  getSanityDate: jest.fn((date: Date) => date.toISOString()),
})
