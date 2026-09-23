import { Either } from './either'

/**
 * An {@link Either} that has not resolved yet, so a chain can keep going across asynchronous
 * steps instead of dropping back into `.then()` at every one. Not a `TaskEither`: the work is
 * already running when the AsyncEither is built.
 * @example
 * const lessons = await AsyncEither.of(run<Lesson[]>(groq))
 *   .map((lessons) => lessons ?? [])
 *   .mapAsync((lessons) => decorateNavigateTo(lessons))
 *   .ltap((error) => console.error(error.message))
 *   .recover([])
 */
export class AsyncEither<L, R> implements PromiseLike<Either<L, R>> {
  private constructor(private readonly promise: Promise<Either<L, R>>) {}

  /** @param promise - the pending Either to lift */
  static of<L, R>(promise: Promise<Either<L, R>>): AsyncEither<L, R> {
    return new AsyncEither(promise)
  }

  /** @param fn - maps the right value once it resolves */
  map<T>(fn: (r: R) => T): AsyncEither<L, T> {
    return AsyncEither.of(this.promise.then((either) => either.map(fn)))
  }

  /** @param fn - maps the right value with an asynchronous function; a rejection propagates */
  mapAsync<T>(fn: (r: R) => Promise<T>): AsyncEither<L, T> {
    return AsyncEither.of(this.promise.then((either) => either.mapAsync(fn)))
  }

  /** @param fn - maps the right value to another AsyncEither, flattening the result */
  flatMap<T>(fn: (r: R) => AsyncEither<L, T>): AsyncEither<L, T> {
    return AsyncEither.of(
      this.promise.then((either) =>
        either.fold(
          (l) => Promise.resolve(Either.left<L, T>(l)),
          (r) => fn(r).promise
        )
      )
    )
  }

  /** @param fn - maps the left value once it resolves */
  lmap<T>(fn: (l: L) => T): AsyncEither<T, R> {
    return AsyncEither.of(this.promise.then((either) => either.lmap(fn)))
  }

  /** @param fn - visits the right value without modifying it */
  tap(fn: (r: R) => void): AsyncEither<L, R> {
    return AsyncEither.of(this.promise.then((either) => either.tap(fn)))
  }

  /** @param fn - visits the left value without modifying it */
  ltap(fn: (l: L) => void): AsyncEither<L, R> {
    return AsyncEither.of(this.promise.then((either) => either.ltap(fn)))
  }

  /**
   * @param onLeft - handles the left value
   * @param onRight - handles the right value
   * @returns {Promise<T | U>}
   */
  fold<T, U>(onLeft: (l: L) => T, onRight: (r: R) => U): Promise<T | U> {
    return this.promise.then((either) => either.fold(onLeft, onRight))
  }

  /**
   * @param defaultValue - returned when the resolved Either is a Left
   * @returns {Promise<R>}
   */
  recover(defaultValue: R): Promise<R> {
    return this.promise.then((either) => either.recover(defaultValue))
  }

  /** @returns {Promise<Either<L, R>>} */
  unlift(): Promise<Either<L, R>> {
    return this.promise
  }

  then<T = Either<L, R>, U = never>(
    onfulfilled?: ((either: Either<L, R>) => T | PromiseLike<T>) | null,
    onrejected?: ((reason: unknown) => U | PromiseLike<U>) | null
  ): Promise<T | U> {
    return this.promise.then(onfulfilled, onrejected)
  }
}
