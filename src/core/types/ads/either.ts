import { Coproduct } from './coproduct'

/**
 * @extends Coproduct
 * It is often used to represent computations that can fail or succeed, where left is error and right is success.
 */
export abstract class Either<L, R> extends Coproduct<L, R> {}
