export abstract class Functor<T> {
  /** Applies a function to the value inside the functor */
  abstract map<U>(fn: (value: T) => U): Functor<U>

  /** Lifts a value into a Functor*/
  static of<T>(_value: T): Functor<T> {
    throw new Error('Method not implemented. Use a subclass of Functor.')
  }
}
