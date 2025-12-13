/**
 * Functor interface for types that can be mapped over.
 *
 * A Functor represents a container or context that holds values and allows
 * those values to be transformed via the `map` function.
 *
 * **Functor Laws:**
 *
 * 1. **Identity**: Mapping with the identity function returns an equivalent functor
 *    ```
 *    functor.map(x => x) ≡ functor
 *    ```
 *
 * 2. **Composition**: Mapping with composed functions equals sequential maps
 *    ```
 *    functor.map(x => g(f(x))) ≡ functor.map(f).map(g)
 *    ```
 *
 * @example
 * // SanityResponse implements Functor
 * const response = new SanityResponse({ id: 1 }, 100, 'query')
 * const transformed = response.map(content => ({ ...content, decorated: true }))
 *
 * @example
 * // Chain multiple transformations
 * const result = response
 *   .map(needsAccessDecorator(perms, adapter))
 *   .map(pageTypeDecorator)
 *
 * @template A - The type of value contained in the functor
 */
export interface Functor<A> {
  /**
   * Apply a function to the value(s) inside the functor, returning a new functor.
   *
   * The implementing class may return a more specific type than Functor<B>.
   *
   * @param fn - Transformation function
   * @returns A new functor with transformed value(s)
   */
  map<B>(fn: (value: A) => B): Functor<B>
}
