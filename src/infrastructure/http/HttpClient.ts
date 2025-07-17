import { HeaderProvider } from './interfaces/HeaderProvider'
import { RequestExecutor } from './interfaces/RequestExecutor'
import { RequestOptions } from './interfaces/RequestOptions'
import { HttpError } from './interfaces/HttpError'
import { NetworkError } from './interfaces/NetworkError'
import { DefaultHeaderProvider } from './providers/DefaultHeaderProvider'
import { FetchRequestExecutor } from './executors/FetchRequestExecutor'
import { Either } from '../../core/types/ads/either'

export class HttpClient {
  private baseUrl: string
  private token: string | null
  private headerProvider: HeaderProvider
  private requestExecutor: RequestExecutor

  constructor(
    baseUrl: string,
    token: string | null = null,
    headerProvider: HeaderProvider = new DefaultHeaderProvider(),
    requestExecutor: RequestExecutor = new FetchRequestExecutor()
  ) {
    this.baseUrl = baseUrl
    this.token = token
    this.headerProvider = headerProvider
    this.requestExecutor = requestExecutor
  }

  public setToken(token: string): void {
    this.token = token
  }

  public async get<T>(
    url: string,
    dataVersion: string | null = null
  ): Promise<Either<HttpError, T>> {
    return this.request<T>(url, 'get', dataVersion)
  }

  public async post<T>(
    url: string,
    data: any,
    dataVersion: string | null = null
  ): Promise<Either<HttpError, T>> {
    return this.request<T>(url, 'post', dataVersion, data)
  }

  public async put<T>(
    url: string,
    data: any,
    dataVersion: string | null = null
  ): Promise<Either<HttpError, T>> {
    return this.request<T>(url, 'put', dataVersion, data)
  }

  public async patch<T>(
    url: string,
    data: any,
    dataVersion: string | null = null
  ): Promise<Either<HttpError, T>> {
    return this.request<T>(url, 'patch', dataVersion, data)
  }

  public async delete<T>(
    url: string,
    dataVersion: string | null = null
  ): Promise<Either<HttpError, T>> {
    return this.request<T>(url, 'delete', dataVersion)
  }

  private async request<T>(
    url: string,
    method: string,
    dataVersion: string | null = null,
    body: any = null
  ): Promise<Either<HttpError, T>> {
    try {
      const headers = this.buildHeaders(dataVersion)
      const options = this.buildRequestOptions(method, headers, body)
      const fullUrl = this.resolveUrl(url)

      return Either.right(await this.requestExecutor.execute<T>(fullUrl, options))
    } catch (error: any) {
      return this.handleError(error, url, method)
    }
  }

  private buildHeaders(dataVersion: string | null): Record<string, string> {
    const headers = this.headerProvider.getHeaders()

    // Add data version if provided
    if (dataVersion) {
      headers['Data-Version'] = dataVersion
    }

    // Add auth token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    return headers
  }

  private buildRequestOptions(
    method: string,
    headers: Record<string, string>,
    body: any
  ): RequestOptions {
    const options: RequestOptions = {
      method,
      headers,
    }

    // Add body for non-GET requests
    if (body) {
      options.body = JSON.stringify(body)
    }

    return options
  }

  private resolveUrl(url: string): string {
    return url.startsWith('/') ? this.baseUrl + url : url
  }

  private handleError(error: any, url: string, method: string): Either<HttpError, never> {
    if ('status' in error) {
      // This is our formatted HTTP error from above
      return Either.left(error as HttpError)
    }

    // Network or other errors
    throw {
      message: error.message || 'Network error',
      url,
      method,
      originalError: error,
    } as NetworkError
  }
}
