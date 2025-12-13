import { Functor } from '../../../lib/ads/functor'

/**
 * Functor class wrapping Sanity query results with metadata.
 *
 * Implements the Functor interface, allowing transformation of the result
 * via `.map()` while preserving metadata (query execution time and query string).
 *
 * Use `.map()` to transform content while preserving metadata.
 *
 * @example
 * const response = new SanityResponse(content, 100, "query")
 * const transformed = response.map(decorator)
 *
 * @implements {Functor<T>}
 * @template T - The type of the result content
 */
export class SanityResponse<T = any> implements Functor<T> {
  constructor(
    public result: T,
    public ms: number,
    public query: string
  ) {}

  /**
   * Transform the result while preserving metadata
   * @param fn - Transformation function
   * @returns New SanityResponse with transformed result
   */
  map<U>(fn: (value: T) => U): SanityResponse<U> {
    return new SanityResponse(fn(this.result), this.ms, this.query)
  }
}

/**
 * Functor class wrapping Sanity list query results with pagination metadata.
 *
 * Implements the Functor interface, allowing transformation of each item in the
 * data array via `.map()` while preserving all metadata (total, sort, offset, limit).
 *
 * Pagination uses standard offset/limit semantics:
 * - offset: Starting position (0-based index)
 * - limit: Maximum number of items to return
 *
 * Use `.map()` to transform each item in the list.
 *
 * @example
 * const response = new SanityListResponse([...], 100, 'title asc', 0, 10)
 * const decorated = response
 *   .map(needsAccessDecorator(perms, adapter))
 *   .map(pageTypeDecorator)
 *
 * @implements {Functor<T>}
 * @template T - The type of items in the data array
 */
export class SanityListResponse<T = any> implements Functor<T> {
  constructor(
    public data: T[],
    public total: number,
    public sort?: string,
    public offset?: number,
    public limit?: number
  ) {}

  /**
   * Transform each item in the data array while preserving metadata
   * @param fn - Transformation function applied to each item
   * @returns New SanityListResponse with transformed data
   */
  map<U>(fn: (value: T) => U): SanityListResponse<U> {
    return new SanityListResponse(this.data.map(fn), this.total, this.sort, this.offset, this.limit)
  }
}
