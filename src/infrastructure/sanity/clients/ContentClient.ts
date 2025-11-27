import { SanityClient } from '../SanityClient'
import { FetchByIdOptions } from '../interfaces/FetchByIdOptions'
import { ConfigProvider } from '../interfaces/ConfigProvider'
import { QueryExecutor } from '../interfaces/QueryExecutor'
import { ContentTypes } from '../../../lib/contentTypes'

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
  public async fetchById<T>(options: FetchByIdOptions): Promise<T | null> {
    try {
      const { type, id, fields, includeChildren = false } = options

      // Build the base query
      let query = `*[railcontent_id == ${id} && _type == '${type}']`

      // Build fields string
      let fieldsString = this.buildFieldsString(type, fields, includeChildren)

      // Complete the query
      query += `{${fieldsString}}[0]`

      return await this.fetchSingle<T>(query)
    } catch (error: any) {
      return this.handleContentError(error, `fetchById(${JSON.stringify(options)})`)
    }
  }

  /**
   * Fetch multiple content items by their IDs
   */
  public async fetchByIds<T>(
    ids: (number | string)[],
    type?: ContentTypes,
    brand?: string,
    fields?: string[]
  ): Promise<T[]> {
    try {
      if (!ids || ids.length === 0) {
        return []
      }

      const idsString = ids.join(',')
      const typeFilter = type ? ` && _type == '${type}'` : ''
      const brandFilter = brand ? ` && brand == "${brand}"` : ''
      const fieldsString = this.buildFieldsString(type, fields, false)

      const query = `*[railcontent_id in [${idsString}]${typeFilter}${brandFilter}]{${fieldsString}}`

      const results = await this.fetchList<T>(query)

      // Sort results to match the order of input IDs
      return results.sort((a: any, b: any) => {
        const indexA = ids.indexOf(a.id || a.railcontent_id)
        const indexB = ids.indexOf(b.id || b.railcontent_id)
        return indexA - indexB
      })
    } catch (error: any) {
      return this.handleContentError(error, `fetchByIds([${ids.join(',')}])`)
    }
  }

  /**
   * Fetch content by brand and type with basic filtering
   */
  public async fetchByTypeAndBrand<T>(
    type: ContentTypes,
    brand?: string,
    options: {
      limit?: number
      offset?: number
      sortBy?: string
      fields?: string[]
    } = {}
  ): Promise<T[]> {
    try {
      const brandFilter = brand ? `brand == "${brand}" && ` : ''
      const { limit = 10, offset = 0, sortBy = 'published_on desc', fields } = options
      const fieldsString = this.buildFieldsString(type, fields, false)

      const query = `*[${brandFilter} _type == "${type}"] | order(${sortBy})[${offset}...${offset + limit}]{${fieldsString}}`

      return await this.fetchList<T>(query)
    } catch (error: any) {
      return this.handleContentError(error, `fetchByBrandAndType(${brand}, ${type})`)
    }
  }

  /**
   * Build fields string for queries based on content type and options
   */
  private buildFieldsString(
    type?: ContentTypes,
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
  private handleContentError(error: any, context: string): never {
    if ('message' in error && 'query' in error) {
      // This is already a SanityError
      throw error
    }

    // Convert to SanityError with context
    throw {
      message: error.message || `ContentClient operation failed: ${context}`,
      query: context,
      originalError: error,
    }
  }
}
