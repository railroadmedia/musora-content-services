export default abstract class BaseContextProvider<T> {
  abstract getValue(): T
  abstract subscribe(callback: (value: T) => void): () => void
}
