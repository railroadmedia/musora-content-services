import { Either } from '../ads/either'
import { SanityClient } from '../../infrastructure/sanity/SanityClient'

export class SanityQueryError extends Error {
  constructor(
    message: string,
    public readonly groq: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'SanityQueryError'
  }
}

export type QueryRunner<T = unknown> = (groq: string) => Promise<Either<SanityQueryError, T | null>>

/**
 * @param {SanityClient} client
 * @returns {QueryRunner<T>}
 */
export const sanityRunner =
  <T = unknown>(client: SanityClient = new SanityClient()): QueryRunner<T> =>
  async (groq: string) => {
    // ponytail: refresh per query because initializeService mutates globalConfig in place;
    // SanityClient's cached copy would go stale. Drop this if config becomes immutable.
    client.refreshConfig()

    try {
      return Either.right<SanityQueryError, T | null>(await client.executeQuery<T>(groq))
    } catch (error: any) {
      return Either.left<SanityQueryError, T | null>(
        new SanityQueryError(error?.message ?? 'Sanity query failed', groq, error)
      )
    }
  }

let cachedRunner: QueryRunner<unknown> | undefined

// ponytail: the cast is safe because the runner never inspects T, it only forwards
// whatever Sanity returns. One cached closure serves every result type.
const defaultRunner = <T>(): QueryRunner<T> =>
  (cachedRunner ??= sanityRunner<unknown>()) as QueryRunner<T>

/**
 * @param {string} groq
 * @param {QueryRunner<T>} runner
 * @returns {Promise<Either<SanityQueryError, T | null>>}
 * @example
 * const result = await run<Song[]>(query().and(f.type('song')).build())
 * result.fold(
 *   (error) => console.error(error.message),
 *   (songs) => console.log(songs?.length ?? 0)
 * )
 * @example
 * // a query that matches nothing is a Right holding null, not a Left,
 * // so recover() does not replace it
 * const empty = await run<Song[]>(groq)
 * empty.recover([]) // null when nothing matched
 * empty.map((songs) => songs ?? []).recover([]) // []
 */
export const run = <T>(
  groq: string,
  runner: QueryRunner<T> = defaultRunner<T>()
): Promise<Either<SanityQueryError, T | null>> => runner(groq)
