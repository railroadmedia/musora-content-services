import { decorateAll, type FieldDecorator } from './base'
import {
  accessDecorator,
  decorateAccess,
  type AccessDecoratable,
} from './need-access'
import {
  pageTypeDecorator,
  decoratePageType,
  type PageTypeDecoratable,
} from './page-type'
import type { UserPermissions } from '../../../services/permissions'

interface ContentRow extends AccessDecoratable, PageTypeDecoratable {
  id: number
  type?: string
  permission_id?: number[]
  children?: ContentRow[]
}

const perms: UserPermissions = {
  permissions: [78, 91],
  isAdmin: false,
  isModerator: false,
  isABasicMember: true,
}

const rows: ContentRow[] = [
  {
    id: 1,
    type: 'course',
    permission_id: [78],
    children: [
      { id: 2, type: 'song', permission_id: [91] },
      { id: 3, type: 'play-along' },
    ],
  },
]

export function singleDecoratorViaWrapper() {
  const decorated = decorateAccess(rows, perms)
  const _na: boolean = decorated[0].need_access
  return decorated
}

export function chainedWrappers() {
  const withAccess = decorateAccess(rows, perms)
  const withBoth = decoratePageType(withAccess)
  const _na: boolean = withBoth[0].need_access
  const _pt: 'song' | 'lesson' = withBoth[0].page_type
  return withBoth
}

export function composedSingleWalk() {
  type Composed = AccessDecoratable & PageTypeDecoratable
  const decorators: FieldDecorator<Composed>[] = [
    accessDecorator(perms) as FieldDecorator<Composed>,
    pageTypeDecorator as FieldDecorator<Composed>,
  ]
  return decorateAll(rows, decorators)
}

export function conditionalComposition(opts: {
  withAccess: boolean
  withPageType: boolean
}) {
  type Composed = AccessDecoratable & PageTypeDecoratable
  const decorators: FieldDecorator<Composed>[] = []
  if (opts.withAccess) {
    decorators.push(accessDecorator(perms) as FieldDecorator<Composed>)
  }
  if (opts.withPageType) {
    decorators.push(pageTypeDecorator as FieldDecorator<Composed>)
  }
  return decorateAll(rows, decorators)
}
