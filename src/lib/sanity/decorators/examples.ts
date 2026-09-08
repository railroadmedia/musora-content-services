import {
  decorateAll,
  decorateAllAsync,
  decorateAsync,
  type FieldDecorator,
  type FieldDecoratorAsync,
} from './base'
import { accessDecorator, decorateAccess, type AccessDecoratable } from './need-access'
import { pageTypeDecorator, decoratePageType, type PageTypeDecoratable } from './page-type'
import {
  decorateNavigateTo,
  navigateToDecorator,
  WithNavigateTo,
  type NavigateToDecoratable,
} from './navigate-to'
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
  hasAllContentAccess: false,
  isForumModerator: false,
  isCommentModerator: false,
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
  decorated[0].need_access satisfies boolean
  return decorated
}

export function chainedWrappers() {
  const withAccess = decorateAccess(rows, perms)
  const withBoth = decoratePageType(withAccess)
  withBoth[0].need_access satisfies boolean
  withBoth[0].page_type satisfies 'song' | 'lesson'
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

export function conditionalComposition(opts: { withAccess: boolean; withPageType: boolean }) {
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
  const decorated = (await decorateAsync(rows, 'progress_percent', (item) =>
    fetchProgress(item.id as number)
  )) as ProgressDecoratable[]
  decorated[0].progress_percent satisfies number | undefined
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
  decorated[0].progress_percent satisfies number | undefined
  decorated[0].is_liked satisfies boolean | undefined
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

const courseLesson = (id: number): NavigateToDecoratable => ({
  id,
  type: 'course-lesson',
  brand: 'drumeo',
  thumbnail: '',
  published_on: null,
  status: 'published',
})

const navigateRows: NavigateToDecoratable[] = [
  {
    id: 1,
    type: 'course',
    brand: 'drumeo',
    thumbnail: '',
    published_on: null,
    status: 'published',
    children: [courseLesson(101), courseLesson(102), courseLesson(103)],
  },
  {
    id: 2,
    type: 'course-collection',
    brand: 'drumeo',
    thumbnail: '',
    published_on: null,
    status: 'published',
    children: [
      {
        id: 201,
        type: 'course',
        brand: 'drumeo',
        thumbnail: '',
        published_on: null,
        status: 'published',
        children: [courseLesson(301), courseLesson(302)],
      },
    ],
  },
]

export async function singleAsyncNavigateTo() {
  const decorated = await decorateNavigateTo(navigateRows)
  void decorated[0].navigateTo
  void decorated[1].navigateTo?.child
  return decorated
}

export async function navigateToOnSingleItem() {
  const decorated = await decorateNavigateTo(navigateRows[0])
  void decorated.navigateTo
  return decorated
}

export async function navigateToComposedWithAccess() {
  interface ContentWithNav extends NavigateToDecoratable, AccessDecoratable {
    permission_id?: number[]
    children?: ContentWithNav[]
  }

  const items: ContentWithNav[] = navigateRows.map((row) => ({
    ...row,
    permission_id: [78],
  }))

  const withAccess = decorateAccess(items, perms)
  const withBoth = await decorateNavigateTo(withAccess)

  withBoth[0].need_access satisfies boolean
  void withBoth[0].navigateTo
  return withBoth
}

export async function navigateToParallelWithProgress() {
  interface ContentWithNavAndProgress extends NavigateToDecoratable {
    progress_percent?: number
  }

  const items = navigateRows as ContentWithNavAndProgress[]
  const decorators: FieldDecoratorAsync<ContentWithNavAndProgress>[] = [
    navigateToDecorator() as FieldDecoratorAsync<ContentWithNavAndProgress>,
    {
      field: 'progress_percent',
      compute: (item) => fetchProgress(item.id),
    },
  ]
  const decorated = (await decorateAllAsync(
    items,
    decorators
  )) as WithNavigateTo<ContentWithNavAndProgress>[]

  void decorated[0].navigateTo
  decorated[0].progress_percent satisfies number | undefined
  return decorated
}
