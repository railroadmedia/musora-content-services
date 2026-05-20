import {
  decorateAll,
  decorateAllAsync,
  decorateAsync,
  type FieldDecorator,
  type FieldDecoratorAsync,
} from './base'
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

interface ProgressDecoratable extends AccessDecoratable {
  progress_percent?: number
  is_liked?: boolean
}

async function fetchProgress(id: number): Promise<number> {
  return id * 10
}

async function fetchLiked(id: number): Promise<boolean> {
  return id % 2 === 0
}

export async function singleAsyncDecorator() {
  const decorated = (await decorateAsync<ProgressDecoratable, number>(
    rows,
    'progress_percent',
    (item) => fetchProgress(item.id as number)
  )) as ProgressDecoratable[]
  const _p: number | undefined = decorated[0].progress_percent
  return decorated
}

export async function parallelAsyncDecorators() {
  const decorators: FieldDecoratorAsync<ProgressDecoratable>[] = [
    {
      field: 'progress_percent',
      compute: (item) => fetchProgress(item.id as number),
    },
    {
      field: 'is_liked',
      compute: (item) => fetchLiked(item.id as number),
    },
  ]
  const decorated = (await decorateAllAsync(
    rows as ProgressDecoratable[],
    decorators
  )) as ProgressDecoratable[]
  const _p: number | undefined = decorated[0].progress_percent
  const _l: boolean | undefined = decorated[0].is_liked
  return decorated
}

export async function mixedSyncThenAsync() {
  const withAccess = decorateAll(rows, [
    accessDecorator(perms) as FieldDecorator<ProgressDecoratable>,
  ]) as ProgressDecoratable[]
  return decorateAllAsync(withAccess, [
    {
      field: 'progress_percent',
      compute: (item) => fetchProgress(item.id as number),
    },
    {
      field: 'is_liked',
      compute: (item) => fetchLiked(item.id as number),
    },
  ])
}
