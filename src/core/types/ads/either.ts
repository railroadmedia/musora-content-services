import { Droppable } from '../interfaces/droppable'
import { DisjointFoldable2 } from '../interfaces/foldable'
import { Recoverable } from '../interfaces/recoverable'
import { Tappable } from '../interfaces/tappable'

/**
 * A monadic container that represents a value that can be either a left or a right value.
 * It is often used to represent computations that can fail or succeed, where left is error and right is success.
 */
export abstract class Either<L, R>
  implements Tappable<L | R>, DisjointFoldable2<L, R>, Droppable<L | R>, Recoverable<R>
{
  static left<L, R>(value: L): Either<L, R> {
    return new Left(value)
  }

  static right<L, R>(value: R): Either<L, R> {
    return new Right(value)
  }
  abstract isLeft(): this is Left<L, R>
  abstract isRight(): this is Right<L, R>

  abstract map<T>(fn: (r: R) => T): Either<L, T>
  abstract flatMap<T>(fn: (r: R) => Either<L, T>): Either<L, T>

  abstract fold<T, U>(onLeft: (l: L) => T, onRight: (r: R) => U): T | U
  foldMap<T>(initial: T, fn: (acc: T, value: L | R) => T): T {
    return this.fold(
      (l) => fn(initial, l),
      (r) => fn(initial, r)
    )
  }

  abstract tap(fn: (l: R) => void): this
  /** Same as tap but for the left value */
  abstract ltap(fn: (l: L) => void): Either<L, R>
  abstract drop(): R | L
  abstract recover(defaultValue: R): R
}

/** A left value in an Either, usually representing a failure or error. */
export class Left<L, R> extends Either<L, R> {
  constructor(private readonly value: L) {
    super()
  }

  isLeft(): this is Left<L, R> {
    return true
  }

  isRight(): this is Right<L, R> {
    return false
  }

  map<T>(_fn: (r: R) => T): Either<L, T> {
    return new Left(this.value)
  }

  flatMap<T>(_fn: (r: R) => Either<L, T>): Either<L, T> {
    return new Left(this.value)
  }

  mapLeft<T>(fn: (l: L) => T): Either<T, R> {
    return new Left(fn(this.value))
  }

  flatMapLeft<T>(fn: (l: L) => Either<T, R>): Either<T, R> {
    return fn(this.value)
  }

  fold<T, U>(onLeft: (l: L) => T, _onRight: (r: R) => U): T | U {
    return onLeft(this.value)
  }

  tap(_fn: (l: R) => void): this {
    return this
  }

  ltap(fn: (l: L) => void): Either<L, R> {
    const valueToTap = this.value
    fn(valueToTap)
    return this
  }

  drop(): L | R {
    return this.value
  }

  recover(defaultValue: R): R {
    return defaultValue
  }
}

/** A right value in an Either, usually representing a success or valid result. */
export class Right<L, R> extends Either<L, R> {
  constructor(private readonly value: R) {
    super()
  }

  isLeft(): this is Left<L, R> {
    return false
  }

  isRight(): this is Right<L, R> {
    return true
  }

  map<T>(fn: (r: R) => T): Either<L, T> {
    return new Right(fn(this.value))
  }

  flatMap<T>(fn: (r: R) => Either<L, T>): Either<L, T> {
    return fn(this.value)
  }

  mapLeft<T>(_fn: (l: R) => T): Either<T, R> {
    return new Right(this.value)
  }

  flatMapLeft<T>(_fn: (l: R) => Either<T, R>): Either<T, R> {
    return new Right(this.value)
  }

  fold<T, U>(_onLeft: (l: L) => T, onRight: (r: R) => U): T | U {
    return onRight(this.value)
  }

  tap(fn: (l: R) => void): this {
    const valueToTap = this.value
    fn(valueToTap)
    return this
  }

  ltap(_fn: (l: L) => void): Either<L, R> {
    return this
  }

  drop(): L | R {
    return this.value
  }

  recover(_defaultValue: R): R {
    // Since this is a Right, we can just return the value
    return this.drop() as R
  }
}
