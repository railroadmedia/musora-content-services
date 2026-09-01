export interface Droppable<T> {
  /** Drops the value out of the container and returns it. */
  drop(): T
}
