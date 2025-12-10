/**
 * Semigroup interface for types that support an associative binary operation.
 *
 * A Semigroup represents a set with a binary operation (concat) that combines
 * two values of the same type into a single value.
 *
 * **Semigroup Law:**
 *
 * **Associativity**: The order of operations doesn't matter
 * ```
 * concat(concat(a, b), c) ≡ concat(a, concat(b, c))
 * ```
 *
 * @example
 * // String concatenation Semigroup
 * const stringConcat: Semigroup<string> = {
 *   concat: (a, b) => a + b
 * }
 *
 * stringConcat.concat('Hello', ' World') // 'Hello World'
 * stringConcat.concat(
 *   stringConcat.concat('a', 'b'),
 *   'c'
 * ) // 'abc' (associative)
 *
 * @example
 * // Number addition Semigroup
 * const numberAdd: Semigroup<number> = {
 *   concat: (a, b) => a + b
 * }
 *
 * numberAdd.concat(1, 2) // 3
 *
 * @example
 * // GROQ filter combination Semigroup
 * const andFilter: Semigroup<string> = {
 *   concat: (a, b) => (!a ? b : !b ? a : `${a} && ${b}`)
 * }
 *
 * andFilter.concat('brand == "drumeo"', 'type == "song"')
 * // Result: 'brand == "drumeo" && type == "song"'
 *
 * @template A - The type of values that can be combined
 */
export interface Semigroup<A> {
  /**
   * Combine two values of type A into a single value.
   *
   * This operation must be associative:
   * concat(concat(a, b), c) === concat(a, concat(b, c))
   *
   * @param a - First value
   * @param b - Second value
   * @returns Combined value
   */
  concat: (a: A, b: A) => A
}
