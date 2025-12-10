import { Semigroup } from './semigroup'

/**
 * Monoid interface for types with an associative binary operation and an identity element.
 *
 * A Monoid extends Semigroup by adding an identity element (empty) that, when combined
 * with any value, returns that value unchanged.
 *
 * **Monoid Laws:**
 *
 * 1. **Associativity** (inherited from Semigroup):
 *    ```
 *    concat(concat(a, b), c) ≡ concat(a, concat(b, c))
 *    ```
 *
 * 2. **Left Identity**: Combining empty with a value returns that value
 *    ```
 *    concat(empty, a) ≡ a
 *    ```
 *
 * 3. **Right Identity**: Combining a value with empty returns that value
 *    ```
 *    concat(a, empty) ≡ a
 *    ```
 *
 * @example
 * // String concatenation Monoid
 * const stringConcat: Monoid<string> = {
 *   empty: '',
 *   concat: (a, b) => a + b
 * }
 *
 * stringConcat.concat(stringConcat.empty, 'Hello') // 'Hello' (left identity)
 * stringConcat.concat('World', stringConcat.empty) // 'World' (right identity)
 *
 * @example
 * // Number addition Monoid
 * const numberAdd: Monoid<number> = {
 *   empty: 0,
 *   concat: (a, b) => a + b
 * }
 *
 * numberAdd.concat(numberAdd.empty, 5) // 5
 * numberAdd.concat(10, numberAdd.empty) // 10
 *
 * @example
 * // GROQ filter combination Monoid (from query builder)
 * const andFilter: Monoid<string> = {
 *   empty: '',
 *   concat: (a, b) => (!a ? b : !b ? a : `${a} && ${b}`)
 * }
 *
 * andFilter.concat(andFilter.empty, 'brand == "drumeo"')
 * // Result: 'brand == "drumeo"' (left identity)
 *
 * andFilter.concat('type == "song"', andFilter.empty)
 * // Result: 'type == "song"' (right identity)
 *
 * @example
 * // Array concatenation Monoid
 * const arrayConcat: Monoid<number[]> = {
 *   empty: [],
 *   concat: (a, b) => [...a, ...b]
 * }
 *
 * arrayConcat.concat([1, 2], [3, 4]) // [1, 2, 3, 4]
 * arrayConcat.concat(arrayConcat.empty, [1, 2]) // [1, 2]
 *
 * @template A - The type of values that can be combined
 */
export interface Monoid<A> extends Semigroup<A> {
  /**
   * The identity element for this Monoid.
   *
   * When combined with any value via concat, returns that value unchanged.
   *
   * Must satisfy:
   * - concat(empty, a) === a (left identity)
   * - concat(a, empty) === a (right identity)
   */
  empty: A
}
