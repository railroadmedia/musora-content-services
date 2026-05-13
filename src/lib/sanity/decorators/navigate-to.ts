import { decorateAsync, type Decoratable, type FieldDecoratorAsync } from './base'
import {
  findIncompleteLesson,
  getLastInteractedOf,
  getProgressState,
  getProgressStateByIds,
} from '../../../services/contentProgress.js'
import { COLLECTION_TYPE } from '../../../services/sync/models/ContentProgress'

export const NAVIGATE_TO_FIELD = 'navigate_to' as const

const STATE_STARTED = 'started'

const NAVIGABLE_TYPES = [
  'course',
  'guided-course',
  'course-collection',
  'song-tutorial',
  'learning-path-v2',
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
  collection: { type: string; id: number } | null
}

export type WithNavigateTo<T extends NavigateToDecoratable> = T & {
  navigate_to: NavigateTo | null
  children?: WithNavigateTo<NonNullable<T['children']>[number]>[]
}

function toNavigateTo(
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

async function computeNavigateTo(content: NavigateToDecoratable): Promise<NavigateTo | null> {
  if (!NAVIGABLE_TYPES.includes(content.type as (typeof NAVIGABLE_TYPES)[number])) return null

  const children = content.children
  if (!children || children.length === 0) return null

  const contentState = await getProgressState(content.id)
  if (contentState !== STATE_STARTED) {
    const firstChild = children[0]
    const childNav = TWO_DEPTH_TYPES.includes(content.type)
      ? await computeNavigateTo(firstChild)
      : null
    return toNavigateTo(firstChild, childNav)
  }

  const childrenIds = children.map((c) => c.id)
  const childrenById = new Map(children.map((c) => [c.id, c]))
  const childrenStates = await getProgressStateByIds(childrenIds)
  const lastInteractedId = await getLastInteractedOf(childrenIds)

  if (COURSE_FLOW_TYPES.includes(content.type)) {
    const lastInteractedStatus = childrenStates.get(lastInteractedId)
    const targetId =
      lastInteractedStatus === STATE_STARTED
        ? lastInteractedId
        : findIncompleteLesson(childrenStates, lastInteractedId, content.type)
    const target = childrenById.get(targetId)
    return target ? toNavigateTo(target) : null
  }

  if (GUIDED_FLOW_TYPES.includes(content.type)) {
    const targetId = findIncompleteLesson(childrenStates, lastInteractedId, content.type)
    const target = childrenById.get(targetId)
    return target ? toNavigateTo(target) : null
  }

  if (TWO_DEPTH_TYPES.includes(content.type)) {
    const lastChild = childrenById.get(lastInteractedId)
    if (!lastChild) return null
    const childNav = await computeNavigateTo(lastChild)
    return toNavigateTo(lastChild, childNav)
  }

  return null
}

export const navigateToDecorator: FieldDecoratorAsync<NavigateToDecoratable, NavigateTo | null> = {
  field: NAVIGATE_TO_FIELD,
  compute: computeNavigateTo,
}

export function decorateNavigateTo<T extends NavigateToDecoratable>(
  items: T[]
): Promise<WithNavigateTo<T>[]>
export function decorateNavigateTo<T extends NavigateToDecoratable>(
  items: T
): Promise<WithNavigateTo<T>>
export function decorateNavigateTo<T extends NavigateToDecoratable>(
  items: T | T[]
): Promise<WithNavigateTo<T> | WithNavigateTo<T>[]> {
  return decorateAsync<NavigateToDecoratable, NavigateTo | null>(
    items,
    NAVIGATE_TO_FIELD,
    computeNavigateTo
  ) as Promise<WithNavigateTo<T> | WithNavigateTo<T>[]>
}
