import { Functor } from './functor'

export abstract class Monad<T> extends Functor<T> {
  /** Applies a function to the value inside the monad, returning a new monad. */
  abstract flatMap<U>(fn: (value: T) => Monad<U>): Monad<U>
}
