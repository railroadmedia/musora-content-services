import { Coproduct } from './coproduct'

/** A Coproduct under the convention that left carries the error and right carries the success value. */
export type Either<L, R> = Coproduct<L, R>

export const Either = {
  left: Coproduct.left,
  right: Coproduct.right,
}
