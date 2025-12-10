/**
 * Functor class wrapping Sanity query results with metadata.
 *
 * Use `.map()` to transform content while preserving metadata.
 *
 * @example
 * const response = new SanityResponse(content, 100, "query")
 * const transformed = response.map(decorator)
 *
 * @template T - The type of the result content
 */
export class SanityResponse<T = any> {
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
 * Use `.map()` to transform each item in the list.
 *
 * @example
 * const response = new SanityListResponse([...], 10)
 * const decorated = response
 *   .map(needsAccessDecorator(perms, adapter))
 *   .map(pageTypeDecorator)
 *
 * @template T - The type of items in the data array
 */
export class SanityListResponse<T = any> {
  constructor(
    public data: T[],
    public total: number,
    public sort?: string,
    public start?: number,
    public end?: number,
    public paginated?: boolean
  ) {}

  /**
   * Transform each item in the data array while preserving metadata
   * @param fn - Transformation function applied to each item
   * @returns New SanityListResponse with transformed data
   */
  map<U>(fn: (value: T) => U): SanityListResponse<U> {
    return new SanityListResponse(
      this.data.map(fn),
      this.total,
      this.sort,
      this.start,
      this.end,
      this.paginated
    )
  }
}
