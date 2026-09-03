import { Coproduct } from './coproduct'

/**
 * A {@link Coproduct} under the convention that left carries the error and right carries the
 * success value.
 * @example
 * function parseAge(input: string): Either<string, number> {
 *   const n = Number(input)
 *   return Number.isNaN(n) ? Either.left('not a number') : Either.right(n)
 * }
 * parseAge('42').map(n => n + 1) // Right(43)
 * parseAge('x').map(n => n + 1)  // Left('not a number')
 */
export type Either<L, R> = Coproduct<L, R>

export const Either = {
  left: Coproduct.left,
  right: Coproduct.right,
}
