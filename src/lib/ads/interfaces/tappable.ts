export interface Tappable<V> {
  /** Visits the value inside the container and applies a function to it without modifying. */
  tap(fn: (value: V) => void): this
}
