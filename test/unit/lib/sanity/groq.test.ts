import { groq } from '../../../../src/lib/sanity/groq'
import { QueryRunner, SanityQueryError } from '../../../../src/lib/sanity/runner'
import { Either } from '../../../../src/lib/ads/either'

const recordingRunner =
  (seen: string[]): QueryRunner<string[]> =>
  async (executed) => {
    seen.push(executed)
    return Either.right(['ok'])
  }

describe('groq', () => {
  test('builds the same string as the plain query builder', () => {
    const result = groq().and('_type == "song"').build()
    expect(result).toBe('*[_type == "song"]')
  })

  test('keeps run available after every chained call', async () => {
    const seen: string[] = []

    await groq()
      .and('_type == "song"')
      .order('published_on desc')
      .slice(0, 10)
      .select('_id', 'title')
      .run(recordingRunner(seen))

    expect(seen).toHaveLength(1)
    expect(seen[0]).toContain('*[_type == "song"]')
    expect(seen[0]).toContain('{ _id, title }')
    expect(seen[0]).toContain('| order(published_on desc)')
    expect(seen[0]).toContain('[0...10]')
  })

  test('returns the runner result', async () => {
    const result = await groq().and('_type == "song"').run(recordingRunner([]))

    expect(result.isRight()).toBe(true)
    expect(result.drop()).toEqual(['ok'])
  })

  test('passes a failure through untouched', async () => {
    const error = new SanityQueryError('boom', '*[]')
    const failingRunner: QueryRunner<string[]> = async () => Either.left(error)

    const result = await groq().and('_type == "song"').run(failingRunner)

    expect(result.isLeft()).toBe(true)
    expect(result.drop()).toBe(error)
  })

  test('runs the query as built at call time', async () => {
    const seen: string[] = []
    const builder = groq().and('_type == "song"')

    await builder.run(recordingRunner(seen))
    builder.and('brand == "drumeo"')
    await builder.run(recordingRunner(seen))

    expect(seen[0]).toBe('*[_type == "song"]')
    expect(seen[1]).toBe('*[_type == "song" && brand == "drumeo"]')
  })

  test('accepts a custom selector', () => {
    const result = groq('*[_type == "song"]').and('brand == "drumeo"').build()
    expect(result).toBe('*[_type == "song"][brand == "drumeo"]')
  })
})

describe('groq.composite', () => {
  test('builds the wrapper object from builders and strings', () => {
    const result = groq
      .composite({
        data: groq().and('_type == "song"'),
        total: 'count(*[_type == "song"])',
      })
      .build()

    expect(result).toBe('{ "data": *[_type == "song"], "total": count(*[_type == "song"]) }')
  })

  test('runs the composed query', async () => {
    const seen: string[] = []

    await groq.composite({ songs: 'count(*[_type == "song"])' }).run(recordingRunner(seen))

    expect(seen).toEqual(['{ "songs": count(*[_type == "song"]) }'])
  })

  test('stringifies its parts eagerly, unlike a groq() chain', async () => {
    const seen: string[] = []
    const inner = groq().and('_type == "song"')
    const composed = groq.composite({ data: inner })

    inner.and('brand == "drumeo"')
    await composed.run(recordingRunner(seen))

    expect(seen).toEqual(['{ "data": *[_type == "song"] }'])
  })

  test('returns the runner result', async () => {
    const result = await groq.composite({ songs: 'count(*[])' }).run(recordingRunner([]))

    expect(result.isRight()).toBe(true)
    expect(result.drop()).toEqual(['ok'])
  })

  test('passes a failure through untouched', async () => {
    const error = new SanityQueryError('boom', '{}')
    const failingRunner: QueryRunner<string[]> = async () => Either.left(error)

    const result = await groq.composite({ songs: 'count(*[])' }).run(failingRunner)

    expect(result.isLeft()).toBe(true)
    expect(result.drop()).toBe(error)
  })
})
