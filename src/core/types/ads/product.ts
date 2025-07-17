import { FoldableProduct } from '../interfaces/foldable'
import { Tappable } from '../interfaces/tappable'

/** A product type that combines two values of potentially different types. */
export abstract class Product<F, S> implements Tappable<F | S>, FoldableProduct<F, S> {
  static of<F, S>(first: F, second: S): Product<F, S> {
    return new Tuple(first, second)
  }

  abstract first(): F
  abstract second(): S

  tap(fn: (value: F | S) => void): this {
    fn(this.first())
    fn(this.second())
    return this
  }

  fold<T>(fn: (f: F, s: S) => T): T {
    return fn(this.first(), this.second())
  }

  foldMap<T>(initial: T, fn: (acc: T, value: F | S) => T): T {
    let acc = initial
    acc = fn(acc, this.first())
    acc = fn(acc, this.second())
    return acc
  }
}

export class Tuple<F, S> extends Product<F, S> {
  constructor(
    private readonly firstValue: F,
    private readonly secondValue: S
  ) {
    super()
  }

  first(): F {
    return this.firstValue
  }

  second(): S {
    return this.secondValue
  }
}
