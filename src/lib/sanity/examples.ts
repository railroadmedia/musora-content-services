import { Filters as f } from './filter'
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
