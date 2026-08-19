import { Filters as f } from './filter'
import { decorateAll, type FieldDecorator } from './decorators/base'
import { accessDecorator, decorateAccess } from './decorators/need-access'
import { lifetimeUpgradeDecorator } from './decorators/need-lifetime-upgrade'
import { pageTypeDecorator } from './decorators/page-type'
import { decorateNavigateTo } from './decorators/navigate-to'
import { fetchUserPermissions, type UserPermissions } from '../../services/permissions'
import { groq } from './groq'
import { composite, query } from './query'
import { run, sanityRunner, QueryRunner, SanityQueryError } from './runner'
import { Either } from '../ads/either'

interface Song {
  _id: string
  title: string
  railcontent_id: number
}

interface SongPage {
  data: Song[]
  total: number
}

const publishedSongs = (brand: string) =>
  f.combine(f.type('song'), f.statusIn(['published']), f.defined('railcontent_id'), f.brand(brand))

export async function fetchSongTitles(brand: string) {
  const result = await groq()
    .and(publishedSongs(brand))
    .order('published_on desc')
    .slice(0, 10)
    .select('_id', 'title', 'railcontent_id')
    .run<Song[]>()

  return result.fold(
    (error) => {
      console.error(`${error.name}: ${error.message}`, error.groq)
      return []
    },
    (songs) => songs ?? []
  )
}

export async function fetchSongPage(brand: string, offset: number, limit: number) {
  const restrictions = publishedSongs(brand)

  const result = await groq
    .composite({
      data: query()
        .and(restrictions)
        .order('published_on desc')
        .slice(offset, limit)
        .select('_id', 'title', 'railcontent_id'),
      total: f.count(restrictions),
    })
    .run<SongPage>()

  return result.recover({ data: [], total: 0 })
}

export async function countSongsAndLessons(brand: string) {
  const result = await run<{ songs: number; lessons: number }>(
    composite({
      songs: f.count(f.combine(f.type('song'), f.brand(brand))),
      lessons: f.count(f.combine(f.typeIn(['course', 'quick-tips']), f.brand(brand))),
    })
  )

  return result
    .map((counts) => counts ?? { songs: 0, lessons: 0 })
    .map((counts) => ({ ...counts, total: counts.songs + counts.lessons }))
    .recover({ songs: 0, lessons: 0, total: 0 })
}

export async function reportMissingSongs(brand: string) {
  const result = await groq().and(publishedSongs(brand)).run<Song[]>()

  if (result.isRight()) {
    return result.drop()
  }

  return null
}

export async function fetchWithSharedClient(groqQueries: string[], runner: QueryRunner<Song[]>) {
  return Promise.all(groqQueries.map((groq) => run<Song[]>(groq, runner)))
}

export function buildRunnerForTests(): QueryRunner<Song[]> {
  return async () => Either.right<SanityQueryError, Song[]>([])
}

export const productionRunner = sanityRunner()

interface Lesson {
  id: number
  type: string
  brand: string
  thumbnail: string
  published_on: string | null
  status: string
  permission_id?: number[]
  children?: Lesson[]
  [key: string]: unknown
}

export async function fetchLessonsWithoutPermissions(brand: string) {
  const result = await groq().and(f.brand(brand)).slice(0, 10).run<Lesson[]>()

  return result
    .map((lessons) =>
      decorateAll<Lesson>(lessons ?? [], [pageTypeDecorator as FieldDecorator<Lesson>])
    )
    .recover([])
}

export async function fetchDecoratedLessons(brand: string) {
  const [result, permissions] = await Promise.all([
    groq()
      .and(f.combine(f.typeIn(['course']), f.brand(brand)))
      .slice(0, 10)
      .run<Lesson[]>(),
    fetchUserPermissions(),
  ])

  return result
    .map((lessons) =>
      decorateAll<Lesson>(lessons ?? [], [
        accessDecorator(permissions) as FieldDecorator<Lesson>,
        lifetimeUpgradeDecorator(permissions) as FieldDecorator<Lesson>,
        pageTypeDecorator as FieldDecorator<Lesson>,
      ])
    )
    .recover([])
}

export async function fetchLessonsWithNavigation(brand: string) {
  const [result, permissions] = await Promise.all([
    groq().and(f.brand(brand)).slice(0, 10).run<Lesson[]>(),
    fetchUserPermissions(),
  ])

  const decorated = await result
    .map((lessons) =>
      decorateAll<Lesson>(lessons ?? [], [accessDecorator(permissions) as FieldDecorator<Lesson>])
    )
    .mapAsync((lessons) => decorateNavigateTo(lessons) as Promise<Lesson[]>)

  return decorated.recover([])
}

export async function fetchWithACustomDecorator(brand: string) {
  const isFree: FieldDecorator<Lesson> = {
    field: 'is_free',
    compute: (lesson) => lesson.permission_id === undefined,
  }

  const result = await groq().and(f.brand(brand)).run<Lesson[]>()

  return result.map((lessons) => decorateAll<Lesson>(lessons ?? [], [isFree])).recover([])
}

export async function fetchWhenPermissionsMayBeUnavailable(brand: string) {
  const queryError = (error: unknown) =>
    Either.left<SanityQueryError, UserPermissions>(
      new SanityQueryError('Failed to fetch user permissions', '', error)
    )

  const [result, permissions] = await Promise.all([
    groq().and(f.brand(brand)).run<Lesson[]>(),
    fetchUserPermissions()
      .then(Either.right<SanityQueryError, UserPermissions>)
      .catch(queryError),
  ])

  return result
    .flatMap((lessons) =>
      permissions.map((userPermissions) =>
        decorateAll<Lesson>(lessons ?? [], [
          accessDecorator(userPermissions) as FieldDecorator<Lesson>,
        ])
      )
    )
    .fold(
      (error) => `undecorated: ${error.message}`,
      (lessons) => `${lessons.length} lessons`
    )
}

export async function decorateManuallyForPreciseTypes(brand: string) {
  const [result, permissions] = await Promise.all([
    groq().and(f.brand(brand)).slice(0, 10).run<Lesson[]>(),
    fetchUserPermissions(),
  ])

  const decorated = await result
    .map((lessons) => decorateAccess(lessons ?? [], permissions))
    .mapAsync((lessons) => decorateNavigateTo(lessons))

  return decorated.fold(
    () => [],
    (lessons) => lessons.map((lesson) => [lesson.need_access, lesson.navigateTo] as const)
  )
}
