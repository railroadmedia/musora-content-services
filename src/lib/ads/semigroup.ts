export interface Semigroup<A> {
  concat: (a: A, b: A) => A
}
