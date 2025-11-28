import { SanityClient } from '../SanityClient'
import { FetchByIdOptions } from '../interfaces/FetchByIdOptions'
import { ConfigProvider } from '../interfaces/ConfigProvider'
import { QueryExecutor } from '../interfaces/QueryExecutor'
import { DocumentTypes } from '../../../lib/documents'
import { SanityListResponse } from '../interfaces/SanityResponse'
import { SanityError } from '../interfaces/SanityError'
import { Either } from '../../../core/types/ads/either'

/**
 * ContentClient extends SanityClient with content-specific methods
 * for easier content fetching and management
 */
export class ContentClient extends SanityClient {
  constructor(configProvider?: ConfigProvider, queryExecutor?: QueryExecutor) {
    super(configProvider, queryExecutor)
  }

  /**
   * Fetch content by type and ID (similar to fetchByRailContentId)
   */
  public async fetchById<T>(options: FetchByIdOptions): Promise<Either<SanityError, T | null>> {
    try {
      const { type, id, fields, includeChildren = false } = options

      // Build the base query
      let query = `*[railcontent_id == ${id} && _type == '${type}']`

      // Build fields string
      let fieldsString = this.buildFieldsString(type, fields, includeChildren)

      // Complete the query
      query += `{${fieldsString}}[0]`

      return this.fetchFirst<T>(query)
    } catch (error: any) {
      return this.handleContentError(error, `fetchById(${JSON.stringify(options)})`)
    }
  }

  /**
   * Fetch multiple content items by their IDs
   */
  public async fetchByIds<T>(
    ids: (number | string)[],
    type?: DocumentTypes,
    brand?: string,
    fields?: string[]
  ): Promise<Either<SanityError, SanityListResponse<T>>> {
    try {
      if (!ids || ids.length === 0) {
        return Either.right({ data: [], total: 0 })
      }

      const idsString = ids.join(',')
      const typeFilter = type ? ` && _type == '${type}'` : ''
      const brandFilter = brand ? ` && brand == "${brand}"` : ''
      const fieldsString = this.buildFieldsString(type, fields, false)

      const query = `*[railcontent_id in [${idsString}]${typeFilter}${brandFilter}]`

      return this.fetchList<T>(query, fieldsString, {
        sort: '-railcontent_id',
        start: 0,
        end: ids.length,
      })
    } catch (error: any) {
      return this.handleContentError(error, `fetchByIds([${ids.join(',')}])`)
    }
  }

  /**
   * Fetch content by brand and type with basic filtering
   */
  public async fetchByTypeAndBrand<T>(
    type: DocumentTypes,
    brand?: string,
    options: {
      limit?: number
      offset?: number
      sortBy?: string
      fields?: string[]
    } = {}
  ): Promise<Either<SanityError, SanityListResponse<T>>> {
    try {
      const brandFilter = brand ? `brand == "${brand}" && ` : ''
      const { limit = 10, offset = 0, sortBy = 'published_on desc', fields } = options
      const fieldsString = this.buildFieldsString(type, fields, false)

      const filter = `${brandFilter} _type == "${type}"`

      return await this.fetchList<T>(filter, fieldsString, {
        sort: sortBy,
        start: offset,
        end: offset + limit,
      })
    } catch (error: any) {
      return this.handleContentError(error, `fetchByBrandAndType(${brand}, ${type})`)
    }
  }

  /**
   * Build fields string for queries based on content type and options
   */
  private buildFieldsString(
    type?: DocumentTypes,
    customFields?: string[],
    includeChildren: boolean = false
  ): string {
    // Default fields that are commonly used
    const defaultFields = [
      "'sanity_id': _id",
      "'id': railcontent_id",
      'railcontent_id',
      'title',
      "'image': thumbnail.asset->url",
      "'thumbnail': thumbnail.asset->url",
      'difficulty',
      'difficulty_string',
      'web_url_path',
      "'url': web_url_path",
      'published_on',
      "'type': _type",
      'brand',
      'status',
      "'slug': slug.current",
      "'permission_id': permission[]->railcontent_id",
      'length_in_seconds',
      "'artist': artist->name",
      "'instructors': instructor[]->name",
    ]

    // Use custom fields if provided, otherwise use defaults
    let fields = customFields || defaultFields

    // Add children-related fields if requested
    if (includeChildren) {
      fields = [
        ...fields,
        "'child_count': coalesce(count(child[]->), 0)",
        `"lessons": child[]->{
          "id": railcontent_id,
          title,
          "image": thumbnail.asset->url,
          "instructors": instructor[]->name,
          length_in_seconds,
          web_url_path
        }`,
      ]
    }

    return fields.join(',\n    ')
  }

  /**
   * Handle and rethrow errors with additional context
   */
  private handleContentError(error: any, context: string): Either<SanityError, never> {
    if ('message' in error && 'query' in error) {
      // This is already a SanityError
      return Either.left(error)
    }

    // Convert to SanityError with context
    return Either.left({
      message: error.message || `ContentClient operation failed: ${context}`,
      query: context,
      originalError: error,
    })
  }
}
