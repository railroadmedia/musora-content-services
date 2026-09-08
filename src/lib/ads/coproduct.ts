import { Droppable } from './interfaces/droppable'
import { DisjointFoldable2 } from './interfaces/foldable'
import { Recoverable } from './interfaces/recoverable'
import { Tappable } from './interfaces/tappable'
import { Monad } from './monad'

/**
 * A monadic container holding either a left value (`L`, usually an error/failure) or a right
 * value (`R`, usually a success). Convention: right is the "happy path" that `map`/`flatMap`
 * operate on; left short-circuits those and passes through unchanged.
 * @example
 * Coproduct.right(5).map(n => n + 1)          // Right(6)
 * Coproduct.left('err').map((n: number) => n) // Left('err'), fn never called
 */
export abstract class Coproduct<L, R>
  implements
    Tappable<L | R>,
    DisjointFoldable2<L, R>,
    Droppable<L | R>,
    Recoverable<R>,
    Monad<L | R>
{
  /** @param value - the left value to wrap */
  static left<L, R>(value: L): Coproduct<L, R> {
    return new Left(value)
  }

  /** @param value - the right value to wrap */
  static right<L, R>(value: R): Coproduct<L, R> {
    return new Right(value)
  }

  /** Type guard: true if this is a {@link Left}. */
  abstract isLeft(): this is Left<L, R>
  /** Type guard: true if this is a {@link Right}. */
  abstract isRight(): this is Right<L, R>

  /**
   * @extends Functor
   * Maps the right value of the Coproduct.
   * @example
   * Coproduct.right(2).map(n => n * 2) // Right(4)
   * Coproduct.left('err').map(n => n)  // Left('err'), fn never called
   */
  abstract map<T>(fn: (r: R) => T): Coproduct<L, T>

  /**
   * Maps the right value of the Coproduct with an asynchronous function.
   * A rejection propagates: there is no way to build an L from it.
   * @example
   * await Coproduct.right(userId).mapAsync(id => fetchUser(id)) // Right(user)
   */
  abstract mapAsync<T>(fn: (r: R) => Promise<T>): Promise<Coproduct<L, T>>

  /**
   * @extends Monad
   * Like {@link map}, but `fn` itself returns a Coproduct instead of a plain value, so nested
   * Coproducts get flattened. No-op on Left.
   * @example
   * Coproduct.right(id).flatMap(id => validate(id)) // validate returns a Coproduct itself
   */
  abstract flatMap<T>(fn: (r: R) => Coproduct<L, T>): Coproduct<L, T>

  /**
   * Maps the left value of the Coproduct to a new type. No-op on Right.
   * @example
   * Coproduct.left(new Error('bad')).lmap(e => e.message) // Left('bad')
   */
  abstract lmap<T>(fn: (l: L) => T): Coproduct<T, R>

  /**
   * Left-side equivalent of {@link flatMap}: `fn` returns a Coproduct, flattening nested
   * results. No-op on Right.
   */
  abstract lflatMap<T>(fn: (l: L) => Coproduct<T, R>): Coproduct<T, R>

  /**
   * Unwraps the Coproduct by calling whichever handler matches its side.
   * @example
   * result.fold(
   *   err => showError(err),
   *   value => showValue(value)
   * )
   */
  abstract fold<T, U>(onLeft: (l: L) => T, onRight: (r: R) => U): T | U

  /** Convenience {@link fold} that applies the same `fn` regardless of side. */
  foldMap<T>(initial: T, fn: (acc: T, value: L | R) => T): T {
    return this.fold(
      (l) => fn(initial, l),
      (r) => fn(initial, r)
    )
  }

  /**
   * Visits the value inside the container if right and applies a function to it without modifying
   * @implements Tappable
   * @example
   * Coproduct.right(user).tap(u => console.log('loaded', u.id)) // logs, still Right(user)
   */
  abstract tap(fn: (r: R) => void): this

  /** Visits the value inside the container if left and applies a function to it without modifying */
  abstract ltap(fn: (l: L) => void): Coproduct<L, R>

  /** Unwraps the Coproduct, returning whichever value it holds (left or right) untouched. */
  abstract drop(): R | L

  /**
   * Returns the right value if it exists, otherwise returns the provided default value.
   * @implements Recoverable
   * @example
   * Coproduct.left('err').recover(0) // 0
   * Coproduct.right(5).recover(0)    // 5
   */
  abstract recover(defaultValue: R): R
}

/** A left value in a Coproduct, usually representing a failure or invalid result. */
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

  async mapAsync<T>(_fn: (r: R) => Promise<T>): Promise<Coproduct<L, T>> {
    return new Left(this.value)
  }

  flatMap<T>(_fn: (r: R) => Coproduct<L, T>): Coproduct<L, T> {
    return new Left(this.value)
  }

  lmap<T>(fn: (l: L) => T): Coproduct<T, R> {
    return new Left(fn(this.value))
  }

  lflatMap<T>(fn: (l: L) => Coproduct<T, R>): Coproduct<T, R> {
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

  async mapAsync<T>(fn: (r: R) => Promise<T>): Promise<Coproduct<L, T>> {
    return new Right(await fn(this.value))
  }

  flatMap<T>(fn: (r: R) => Coproduct<L, T>): Coproduct<L, T> {
    return fn(this.value)
  }

  lmap<T>(_fn: (l: L) => T): Coproduct<T, R> {
    return new Right(this.value)
  }

  lflatMap<T>(_fn: (l: L) => Coproduct<T, R>): Coproduct<T, R> {
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
