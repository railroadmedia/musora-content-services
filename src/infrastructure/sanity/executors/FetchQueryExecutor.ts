import { QueryExecutor } from '../interfaces/QueryExecutor'
import { SanityQuery } from '../interfaces/SanityQuery'
import { SanityResponse } from '../interfaces/SanityResponse'
import { SanityConfig } from '../interfaces/SanityConfig'
import { SanityError } from '../interfaces/SanityError'

const GET_URL_MAX_LENGTH = 8000

export class FetchQueryExecutor implements QueryExecutor {
  async execute<T>(query: SanityQuery, config: SanityConfig): Promise<SanityResponse<T>> {
    const baseUrl = this.buildUrl(config)
    const { url, options } = this.buildRequest(baseUrl, query, config)

    if (config.debug) {
      console.log('Sanity Query:', query.query)
    }

    try {
      const response = await fetch(url, options)

      if (!response.ok) {
        throw await this.createSanityError(response, query)
      }

      const result = await response.json()
      
      if (config.debug) {
        console.log('Sanity Results:', result)
      }

      return result as SanityResponse<T>
    } catch (error: any) {
      if ('message' in error && 'query' in error) {
        throw error as SanityError
      }

      throw {
        message: error.message || 'Sanity query execution failed',
        query: query.query,
        params: query.params,
        originalError: error,
      } as SanityError
    }
  }

  private buildUrl(config: SanityConfig): string {
    const perspective = config.perspective ?? 'published'
    const api = config.useCachedAPI ? 'apicdn' : 'api'
    return `https://${config.projectId}.${api}.sanity.io/v${config.version}/data/query/${config.dataset}?perspective=${perspective}`
  }

  private buildRequest(
    baseUrl: string,
    query: SanityQuery,
    config: SanityConfig
  ): { url: string; options: RequestInit } {
    const authHeader: Record<string, string> = config.token
      ? { Authorization: `Bearer ${config.token}` }
      : {}

    const hasParams = query.params && Object.keys(query.params).length > 0
    const encodedQuery = encodeURIComponent(query.query)
    const getUrl = `${baseUrl}&query=${encodedQuery}`
    const canUseGet = !hasParams && getUrl.length < GET_URL_MAX_LENGTH

    if (canUseGet) {
      return {
        url: getUrl,
        options: {
          method: 'GET',
          headers: authHeader,
        },
      }
    }

    return {
      url: baseUrl,
      options: {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      },
    }
  }

  private async createSanityError(
    response: Response,
    query: SanityQuery
  ): Promise<SanityError> {
    let errorMessage = `Sanity API error: ${response.status} - ${response.statusText}`
    
    try {
      const errorBody = await response.json()
      if (errorBody.message) {
        errorMessage = errorBody.message
      }
    } catch (e) {
      // If we can't parse the error body, use the default message
    }

    return {
      message: errorMessage,
      query: query.query,
      params: query.params,
    }
  }
} 