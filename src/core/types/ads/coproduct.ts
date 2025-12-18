import { Droppable } from '../interfaces/droppable'
import { DisjointFoldable2 } from '../interfaces/foldable'
import { Recoverable } from '../interfaces/recoverable'
import { Tappable } from '../interfaces/tappable'
import { Monad } from './monad'

/** A monadic container that represents a value that can be either a left or a right value. */
export abstract class Coproduct<L, R>
  implements
    Tappable<L | R>,
    DisjointFoldable2<L, R>,
    Droppable<L | R>,
    Recoverable<R>,
    Monad<L | R>
{
  static left<L, R>(value: L): Coproduct<L, R> {
    return new Left(value)
  }

  static right<L, R>(value: R): Coproduct<L, R> {
    return new Right(value)
  }

  abstract isLeft(): this is Left<L, R>
  abstract isRight(): this is Right<L, R>

  /**
   * @extends Functor
   * Maps the right value of the Coproduct.
   */
  abstract map<T>(fn: (r: R) => T): Coproduct<L, T>
  /**
   * @extends Monad
   * Applies a function to the right value of the Coproduct, returning a new Coproduct.
   */
  abstract flatMap<T>(fn: (r: R) => Coproduct<L, T>): Coproduct<L, T>

  /** Maps the left value of the Coproduct to a new type. */
  abstract mapLeft<T>(fn: (l: L) => T): Coproduct<T, R>

  /** Applies a function to the left value of the Coproduct, returning a new Coproduct. */
  abstract flatMapLeft<T>(fn: (l: L) => Coproduct<T, R>): Coproduct<T, R>

  abstract fold<T, U>(onLeft: (l: L) => T, onRight: (r: R) => U): T | U
  foldMap<T>(initial: T, fn: (acc: T, value: L | R) => T): T {
    return this.fold(
      (l) => fn(initial, l),
      (r) => fn(initial, r)
    )
  }

  /**
   * Visits the value inside the container if right and applies a function to it without modifying
   * @implements Tappable
   */
  abstract tap(fn: (r: R) => void): this

  /** Visits the value inside the container if left and applies a function to it without modifying */
  abstract ltap(fn: (l: L) => void): Coproduct<L, R>
  abstract drop(): R | L
  /**
   * Returns the right value if it exists, otherwise returns the provided default value.
   * @implements Recoverable
   */
  abstract recover(defaultValue: R): R
}

export class Left<L, R> extends Coproduct<L, R> {
  constructor(private readonly value: L) {
    super()
  }

  isLeft(): this is Left<L, R> {
    return true
  }

  isRight(): this is Right<L, R> {
    return false
  }

  map<T>(_fn: (r: R) => T): Coproduct<L, T> {
    return new Left(this.value)
  }

  flatMap<T>(_fn: (r: R) => Coproduct<L, T>): Coproduct<L, T> {
    return new Left(this.value)
  }

  mapLeft<T>(fn: (l: L) => T): Coproduct<T, R> {
    return new Left(fn(this.value))
  }

  flatMapLeft<T>(fn: (l: L) => Coproduct<T, R>): Coproduct<T, R> {
    return fn(this.value)
  }

  fold<T, U>(onLeft: (l: L) => T, _onRight: (r: R) => U): T | U {
    return onLeft(this.value)
  }

  tap(_fn: (l: R) => void): this {
    return this
  }

  ltap(fn: (l: L) => void): Coproduct<L, R> {
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

/** A right value in an Coproduct, usually representing a success or valid result. */
export class Right<L, R> extends Coproduct<L, R> {
  constructor(private readonly value: R) {
    super()
  }

  isLeft(): this is Left<L, R> {
    return false
  }

  isRight(): this is Right<L, R> {
    return true
  }

  map<T>(fn: (r: R) => T): Coproduct<L, T> {
    return new Right(fn(this.value))
  }

  flatMap<T>(fn: (r: R) => Coproduct<L, T>): Coproduct<L, T> {
    return fn(this.value)
  }

  mapLeft<T>(_fn: (l: L) => T): Coproduct<T, R> {
    return new Right(this.value)
  }

  flatMapLeft<T>(_fn: (l: L) => Coproduct<T, R>): Coproduct<T, R> {
    return new Right(this.value)
  }

  fold<T, U>(_onLeft: (l: L) => T, onRight: (r: R) => U): T | U {
    return onRight(this.value)
  }

  tap(fn: (r: R) => void): this {
    const valueToTap = this.value
    fn(valueToTap)
    return this
  }

  ltap(_fn: (l: L) => void): Coproduct<L, R> {
    return this
  }

  drop(): L | R {
    return this.value
  }

  recover(_defaultValue: R): R {
    return this.drop() as R
  }
}
