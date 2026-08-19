export interface Recoverable<T> {
  /** Recovers the value from the container, providing a default value if the container is empty or contains lefty values. */
  recover(defaultValue: T): T
}
