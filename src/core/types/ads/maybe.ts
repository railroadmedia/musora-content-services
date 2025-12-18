import { Droppable } from '../interfaces/droppable'
import { DisjointFoldable1 } from '../interfaces/foldable'
import { Monad } from './monad'
import { Tappable } from '../interfaces/tappable'
import { Recoverable } from '../interfaces/recoverable'

/** A monad that represents a value that may or may not be present. */
export abstract class Maybe<T>
  extends Monad<T>
  implements Tappable<T>, DisjointFoldable1<T>, Droppable<T | null>, Recoverable<T>
{
  static of<T>(value?: T): Maybe<T> {
    return value ? Some.of(value) : None.of()
  }

  abstract isNone(): this is None<T>
  abstract isSome(): this is Some<T>

  /**
   * @implements Tappable - taps the value if it is Some
   */
  abstract tap(fn: (t: T) => void): this

  abstract fold<U>(onNone: () => U, onSome: (a: T) => U): U
  abstract foldMap<U>(initial: U, _fn: (acc: U, value: T) => U): U

  /**
   * @extends Functor
   * Maps the value inside the Maybe to a new type if it is Some
   */
  abstract map<U>(fn: (value: T) => U): Monad<U>
  /**
   * @extends Monad
   * Applies a function to the value inside the Maybe if it is Some, returning a new Maybe.
   */
  abstract flatMap<U>(fn: (value: T) => Monad<U>): Monad<U>

  abstract drop(): T | null

  /**
   * @implements Recoverable - Returns value if it is Some, otherwise returns the provided default value.
   */
  abstract recover(defaultValue: T): T
}

export class Some<T> extends Maybe<T> {
  constructor(private readonly value: T) {
    super()
  }

  isNone(): this is None<T> {
    return false
  }

  isSome(): this is Some<T> {
    return true
  }

  map<U>(fn: (value: T) => U): Monad<U> {
    return Some.of(fn(this.value))
  }

  flatMap<U>(fn: (value: T) => Monad<U>): Monad<U> {
    return fn(this.value)
  }

  fold<U>(_onNone: () => U, onSome: (t: T) => U): U {
    return onSome(this.value)
  }

  foldMap<U>(initial: U, fn: (acc: U, value: T) => U): U {
    return fn(initial, this.value)
  }

  tap(fn: (t: T) => void): this {
    const valueToTap = this.value
    fn(valueToTap)
    return this
  }

  drop(): T | null {
    return this.value
  }

  recover(_defaultValue: T): T {
    return this.drop() as T
  }
}

export class None<T> extends Maybe<T> {
  constructor() {
    super()
  }

  isNone(): this is None<T> {
    return true
  }

  isSome(): this is Some<T> {
    return false
  }

  map<U>(_fn: (value: T) => U): Monad<U> {
    return new None<U>()
  }

  flatMap<U>(_fn: (value: T) => Monad<U>): Monad<U> {
    return new None<U>()
  }

  fold<U>(onNone: () => U, _onSome: (t: T) => U): U {
    return onNone()
  }

  foldMap<U>(initial: U, _fn: (acc: U, value: T) => U): U {
    return initial
  }

  tap(_fn: (t: T) => void): this {
    return this
  }

  drop(): T | null {
    return null
  }

  recover(defaultValue: T): T {
    return defaultValue
  }
}
