import { Either } from '../ads/either'
import { FieldAccess } from './field-access'
import { composite, query, QueryBuilder } from './query'
import { QueryRunner, run, SanityQueryError } from './runner'

export interface RunnableQuery {
  build(): string
  toString(): string
  run<T>(runner?: QueryRunner<T>): Promise<Either<SanityQueryError, T | null>>
}

export interface GroqBuilder extends QueryBuilder, RunnableQuery {
  selector(selector: string): GroqBuilder
  and(expr: string): GroqBuilder
  or(...exprs: string[]): GroqBuilder
  order(expr: string): GroqBuilder
  slice(offset: number, limit?: number): GroqBuilder
  first(): GroqBuilder
  select(...fields: string[]): GroqBuilder
  access(field: string, fieldAccess?: FieldAccess): GroqBuilder
  dereference(): GroqBuilder
  postFilter(expr: string): GroqBuilder
}

/**
 * @param {string} selector
 * @returns {GroqBuilder}
 * @example
 * const result = await groq()
 *   .and(f.type('song'))
 *   .order('published_on desc')
 *   .slice(0, 10)
 *   .select('_id', 'title')
 *   .run<Song[]>()
 */
const groqBuilder = (selector?: string): GroqBuilder => {
  const builder = query(selector)

  return Object.assign(builder, {
    run: <T>(runner?: QueryRunner<T>) => run<T>(builder.build(), runner),
  }) as GroqBuilder
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
