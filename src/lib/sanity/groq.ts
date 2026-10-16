import { AsyncEither } from '../ads/async-either'
import { FieldAccess } from './field-access'
import { composite, query, QueryBuilder, QueryBuilderState } from './query'
import { QueryRunner, run, SanityQueryError } from './runner'

type ElementOf<T> = T extends (infer U)[] ? U : T

type Field<T> = (keyof ElementOf<T> & string) | (string & {})

export interface RunnableQuery {
  build(): string
  toString(): string
  run<T>(runner?: QueryRunner<T>): AsyncEither<SanityQueryError, T | null>
}

interface Chainable<T, Self> {
  selector(selector: string): Self
  and(expr: string): Self
  or(...exprs: string[]): Self
  order(expr: string): Self
  slice(offset: number, limit?: number): Self
  select(...fields: Field<T>[]): Self
  access(field: Field<T>, fieldAccess?: FieldAccess): Self
  dereference(): Self
  postFilter(expr: string): Self
  build(): string
  toString(): string

  _state(): QueryBuilderState
}

/**
 * `Empty` is what `run` resolves to when the query matched nothing. {@link GroqBuilder.default}
 * supplies a fallback and narrows it to `never`, which is the state a builder is assumed to be in
 * unless it says otherwise: a builder that has not been given one is a `GroqBuilder<T, null>`.
 */
export interface GroqBuilder<T = unknown, Empty = never> extends Chainable<T, GroqBuilder<T, Empty>> {
  /**
   * Never read. Methods are checked bivariantly, so without a property here a builder with no
   * fallback would silently satisfy a signature promising one.
   */
  readonly __empty?: Empty

  first(): GroqBuilder<ElementOf<T>, Empty>
  default(value: T): GroqBuilder<T, never>
  run<U = T>(runner?: QueryRunner<U>): AsyncEither<SanityQueryError, U | Empty>
}

/**
 * @param {string} selector
 * @returns {GroqBuilder<T>}
 * @example
 * const result = await groq()
 *   .and(f.type('song'))
 *   .order('published_on desc')
 *   .slice(0, 10)
 *   .select('_id', 'title')
 *   .run<Song[]>()
 * @example
 * // naming the type up front keeps it off every call in the chain
 * const songs = await groq<Song[]>().and(f.type('song')).default([]).run()
 */
const groqBuilder = <T = unknown>(selector?: string): GroqBuilder<T, null> => {
  const builder = query(selector)
  let fallback: { value: unknown } | undefined

  const runnable = Object.assign(builder, {
    default: (value: unknown) => {
      fallback = { value }
      return runnable
    },
    run: <U = T>(runner?: QueryRunner<U>) => {
      const result = run<U>(builder.build(), runner)

      return fallback ? result.map((value) => value ?? (fallback.value as U)) : result
    },
  })

  return runnable as unknown as GroqBuilder<T, null>
}

/**
 * @param {Record<string, QueryBuilder | string>} parts
 * @returns {RunnableQuery}
 * @example
 * const result = await groq
 *   .composite({
 *     data: groq().and(restrictions).slice(0, 10).select('_id', 'title'),
 *     total: f.count(restrictions),
 *   })
 *   .run<SongPage>()
 */
const compositeQuery = (parts: Record<string, QueryBuilder | string>): RunnableQuery => {
  const built = composite(parts)

  return {
    build: () => built,
    toString: () => built,
    run: <T>(runner?: QueryRunner<T>) => run<T>(built, runner),
  }
}

export const groq = Object.assign(groqBuilder, { composite: compositeQuery })
