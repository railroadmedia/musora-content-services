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

export interface GroqBuilder<T = unknown> extends Chainable<T, GroqBuilder<T>> {
  first(): GroqBuilder<ElementOf<T>>
  run<U = T>(runner?: QueryRunner<U>): AsyncEither<SanityQueryError, U | null>
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
 * const songs = await groq<Song[]>().and(f.type('song')).run().defaultTo([])
 */
const groqBuilder = <T = unknown>(selector?: string): GroqBuilder<T> => {
  const builder = query(selector)

  return Object.assign(builder, {
    run: <U = T>(runner?: QueryRunner<U>) => run<U>(builder.build(), runner),
  }) as unknown as GroqBuilder<T>
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
