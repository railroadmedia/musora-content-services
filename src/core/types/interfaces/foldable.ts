export interface Foldable<A> {
  /**
   * Folds the values in the container using the provided function.
   * Similar to reduce for collections (arrays/lists/trees)
   */
  foldMap<T>(initial: T, fn: (acc: T, value: A) => T): T
}

/** FoldableProduct is a specialized Foldable for containers that hold two values, like a tuple. */
export interface FoldableProduct<F, S> extends Foldable<F | S> {
  fold<T>(fn: (first: F, second: S) => T): T
}

/** DisjointFoldable is a specialized Foldable for containers that can hold either a single value or none, like Maybe. */
export interface DisjointFoldable1<A> extends Foldable<A> {
  /** Folds the values in the container using the provided function. */
  fold<T>(onNone: () => T, onSome: (a: A) => T): T
}

/** DisjointFoldable2 is a specialized Foldable for containers that can hold either a left or right value, like Either. */
export interface DisjointFoldable2<L, R> extends Foldable<L | R> {
  /** Folds the values in the container using the provided functions for left and right. */
  fold<T>(onLeft: (l: L) => T, onRight: (r: R) => T): T
}
