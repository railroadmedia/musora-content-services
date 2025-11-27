import { ConfigProvider } from './interfaces/ConfigProvider'
import { QueryExecutor } from './interfaces/QueryExecutor'
import { SanityQuery } from './interfaces/SanityQuery'
import { SanityConfig } from './interfaces/SanityConfig'
import { SanityError } from './interfaces/SanityError'
import { DefaultConfigProvider } from './providers/DefaultConfigProvider'
import { FetchQueryExecutor } from './executors/FetchQueryExecutor'

export class SanityClient {
  private configProvider: ConfigProvider
  private queryExecutor: QueryExecutor
  private config: SanityConfig | null = null

  constructor(
    configProvider: ConfigProvider = new DefaultConfigProvider(),
    queryExecutor: QueryExecutor = new FetchQueryExecutor()
  ) {
    this.configProvider = configProvider
    this.queryExecutor = queryExecutor
  }

  /**
   * Execute a GROQ query and return a single result
   */
  public async fetchSingle<T>(query: string, params?: Record<string, any>): Promise<T | null> {
    try {
      const sanityQuery: SanityQuery = { query, params }
      const response = await this.queryExecutor.execute<T[]>(sanityQuery, this.getConfig())

      if (response.result && Array.isArray(response.result) && response.result.length > 0) {
        return response.result[0]
      } else if (response.result && !Array.isArray(response.result)) {
        return response.result
      }

      return null
    } catch (error: any) {
      return this.handleError(error, query)
    }
  }

  /**
   * Execute a GROQ query and return a result
   */
  public async fetchRaw<T>(query: string, params?: Record<string, any>): Promise<T | null> {
    try {
      const sanityQuery: SanityQuery = { query, params }
      const response = await this.queryExecutor.execute<T>(sanityQuery, this.getConfig())

      if (response.result) {
        return response.result
      }

      return null
    } catch (error: any) {
      return this.handleError(error, query)
    }
  }

  /**
   * Execute a GROQ query and return multiple results
   */
  public async fetchList<T>(query: string, params?: Record<string, any>): Promise<T[]> {
    try {
      const sanityQuery: SanityQuery = { query, params }
      const response = await this.queryExecutor.execute<T[]>(sanityQuery, this.getConfig())

      return response.result || []
    } catch (error: any) {
      return this.handleError(error, query)
    }
  }

  /**
   * Execute a raw GROQ query and return the full response
   */
  public async executeQuery<T>(query: string, params?: Record<string, any>): Promise<T | null> {
    try {
      const sanityQuery: SanityQuery = { query, params }
      const response = await this.queryExecutor.execute<T>(sanityQuery, this.getConfig())

      return response.result
    } catch (error: any) {
      return this.handleError(error, query)
    }
  }

  /**
   * Get configuration, loading it if necessary
   */
  private getConfig(): SanityConfig {
    if (!this.config) {
      this.config = this.configProvider.getConfig()
    }
    return this.config
  }

  /**
   * Handle and rethrow errors
   */
  private handleError(error: any, query: string): never {
    if ('message' in error && 'query' in error) {
      // This is already a SanityError
      throw error as SanityError
    }

    // Convert to SanityError
    throw {
      message: error.message || 'Sanity query failed',
      query,
      originalError: error,
    } as SanityError
  }

  /**
   * Refresh the configuration (useful if global config changes)
   */
  public refreshConfig(): void {
    this.config = null
  }
}
