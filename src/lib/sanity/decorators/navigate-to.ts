import { decorateAllAsync, type Decoratable, type FieldDecoratorAsync } from './base'
import {
  COLLECTION_TYPE,
  CollectionParameter,
  STATE,
} from '../../../services/sync/models/ContentProgress'
import { Progress } from '@/services/progress'

export const NAVIGATE_TO_FIELD = 'navigateTo' as const

const NAVIGABLE_TYPES = [
  'course',
  'guided-course',
  'course-collection',
  'song-tutorial',
  COLLECTION_TYPE.LEARNING_PATH,
  'skill-pack',
] as const

const COURSE_FLOW_TYPES = ['course', 'skill-pack', 'song-tutorial']
const GUIDED_FLOW_TYPES = ['guided-course', COLLECTION_TYPE.LEARNING_PATH]
const TWO_DEPTH_TYPES = ['course-collection']

export interface NavigateToDecoratable extends Decoratable {
  id: number
  type: string
  brand: string
  thumbnail: string
  published_on: string | null
  status: string
  children?: NavigateToDecoratable[]
}

export interface NavigateTo {
  id: number
  type: string
  brand: string
  thumbnail: string
  published_on: string | null
  status: string
  child: NavigateTo | null
  collection: CollectionParameter | null
}

export type WithNavigateTo<T extends NavigateToDecoratable> = T & {
  navigateTo: NavigateTo | null
}

function buildNavigateTo(
  content: NavigateToDecoratable,
  child: NavigateTo | null = null,
  collection: NavigateTo['collection'] = null
): NavigateTo {
  return {
    id: content.id,
    type: content.type,
    brand: content.brand,
    thumbnail: content.thumbnail,
    published_on: content.published_on,
    status: content.status,
    child,
    collection,
  }
}

interface NavigateContext {
  states: Map<number, string>
}

async function prefetchStates(items: NavigateToDecoratable[]): Promise<NavigateContext> {
  const ids = new Set<number>()
  for (const item of items) {
    if (!item || !NAVIGABLE_TYPES.includes(item.type as (typeof NAVIGABLE_TYPES)[number])) continue
    ids.add(item.id)
    for (const child of item.children ?? []) {
      ids.add(child.id)
      if (TWO_DEPTH_TYPES.includes(item.type)) {
        for (const grandchild of child.children ?? []) {
          ids.add(grandchild.id)
        }
      }
    }
  }
  if (ids.size === 0) return { states: new Map() }
  const states = await Progress.stateByIds(Array.from(ids))
  return { states }
}

async function computeNavigateTo(
  content: NavigateToDecoratable,
  ctx?: NavigateContext
): Promise<NavigateTo | null> {
  if (!NAVIGABLE_TYPES.includes(content.type as (typeof NAVIGABLE_TYPES)[number])) return null

  const children = content.children
  if (!children || children.length === 0) return null

  const contentState = ctx?.states.get(content.id) ?? (await Progress.state(content.id))
  if (contentState !== STATE.STARTED) {
    const firstChild = children[0]
    const childNav = TWO_DEPTH_TYPES.includes(content.type)
      ? await computeNavigateTo(firstChild, ctx)
      : null
    return buildNavigateTo(firstChild, childNav)
  }

  const childrenIds = children.map((c) => c.id)
  const childrenById = new Map(children.map((c) => [c.id, c]))
  const childrenStates = ctx
    ? new Map(childrenIds.map((id) => [id, ctx.states.get(id) ?? '']))
    : await Progress.stateByIds(childrenIds)
  const lastInteractedId = await Progress.lastInteractedOf(childrenIds)

  if (COURSE_FLOW_TYPES.includes(content.type)) {
    const lastInteractedStatus = childrenStates.get(lastInteractedId)
    const targetId =
      lastInteractedStatus === STATE.STARTED
        ? lastInteractedId
        : Progress.incompleteLesson(childrenStates, content.type, lastInteractedId)
    const target = childrenById.get(targetId)
    return target ? buildNavigateTo(target) : null
  }

  if (GUIDED_FLOW_TYPES.includes(content.type)) {
    const targetId = Progress.incompleteLesson(childrenStates, content.type, lastInteractedId)
    const target = childrenById.get(targetId)
    return target ? buildNavigateTo(target) : null
  }

  if (TWO_DEPTH_TYPES.includes(content.type)) {
    const lastChild = childrenById.get(lastInteractedId)
    if (!lastChild) return null
    const childNav = await computeNavigateTo(lastChild, ctx)
    return buildNavigateTo(lastChild, childNav)
  }

  return null
}

export function navigateToDecorator(
  ctx?: NavigateContext
): FieldDecoratorAsync<NavigateToDecoratable, typeof NAVIGATE_TO_FIELD, NavigateTo | null> {
  return {
    field: NAVIGATE_TO_FIELD,
    compute: (item) => computeNavigateTo(item, ctx),
    recurse: false,
  }
}

export function decorateNavigateTo<T extends NavigateToDecoratable>(
  items: T[]
): Promise<WithNavigateTo<T>[]>
export function decorateNavigateTo<T extends NavigateToDecoratable>(
  items: T
): Promise<WithNavigateTo<T>>
export async function decorateNavigateTo<T extends NavigateToDecoratable>(
  items: T | T[]
): Promise<WithNavigateTo<T> | WithNavigateTo<T>[]> {
  const list = Array.isArray(items) ? items : [items]
  const ctx = await prefetchStates(list)
  return decorateAllAsync(items as NavigateToDecoratable, [navigateToDecorator(ctx)]) as Promise<
    WithNavigateTo<T> | WithNavigateTo<T>[]
  >
}
