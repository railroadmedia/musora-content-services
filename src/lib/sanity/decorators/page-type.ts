import { decorate, type Decoratable, type FieldDecorator } from './base'
import { SONG_TYPES_WITH_CHILDREN } from '../../../contentTypeConfig.js'

export const PAGE_TYPE_FIELD = 'page_type' as const

export type PageType = 'song' | 'lesson'

export interface PageTypeDecoratable extends Decoratable {
  type?: string
  children?: PageTypeDecoratable[]
}

export type WithPageType<T extends PageTypeDecoratable> = T & {
  page_type: PageType
  children?: WithPageType<NonNullable<T['children']>[number]>[]
}

export const pageTypeDecorator: FieldDecorator<
  PageTypeDecoratable,
  typeof PAGE_TYPE_FIELD,
  PageType
> = {
  field: PAGE_TYPE_FIELD,
  compute: (item) => (SONG_TYPES_WITH_CHILDREN.includes(item.type as string) ? 'song' : 'lesson'),
}

export function decoratePageType<T extends PageTypeDecoratable>(items: T[]): WithPageType<T>[]
export function decoratePageType<T extends PageTypeDecoratable>(items: T): WithPageType<T>
export function decoratePageType<T extends PageTypeDecoratable>(
  items: T | T[]
): WithPageType<T> | WithPageType<T>[] {
  return decorate(items as T, pageTypeDecorator.field, pageTypeDecorator.compute) as
    | WithPageType<T>
    | WithPageType<T>[]
}
