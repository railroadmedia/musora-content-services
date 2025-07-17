import { Droppable } from '../interfaces/droppable'
import { DisjointFoldable1 } from '../interfaces/foldable'
import { Monad } from './monad'
import { Tappable } from '../interfaces/tappable'

/** A monad that represents a value that may or may not be present. */
export abstract class Maybe<T>
  extends Monad<T>
  implements Tappable<T>, DisjointFoldable1<T>, Droppable<T | null>
{
  static of<T>(value?: T): Maybe<T> {
    return value ? Some.of(value) : None.of()
  }

  abstract isNone(): this is None<T>
  abstract isSome(): this is Some<T>

  abstract drop(): T | null

  abstract tap(fn: (l: T) => void): this

  abstract fold<U>(onNone: () => U, onSome: (a: T) => U): U
  abstract foldMap<U>(initial: U, _fn: (acc: U, value: T) => U): U

  abstract map<U>(fn: (value: T) => U): Monad<U>
  abstract flatMap<U>(fn: (value: T) => Monad<U>): Monad<U>
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

  tap(fn: (l: T) => void): this {
    const valueToTap = this.value
    fn(valueToTap)
    return this
  }

  drop(): T | null {
    return this.value
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

  tap(_fn: (l: T) => void): this {
    return this
  }

  drop(): T | null {
    return null
  }
}
