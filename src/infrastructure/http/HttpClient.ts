import { HeaderProvider } from './interfaces/HeaderProvider'
import { RequestExecutor } from './interfaces/RequestExecutor'
import { RequestOptions } from './interfaces/RequestOptions'
import { HttpError } from './interfaces/HttpError'
import { NetworkError } from './interfaces/NetworkError'
import { DefaultHeaderProvider } from './providers/DefaultHeaderProvider'
import { FetchRequestExecutor } from './executors/FetchRequestExecutor'
import { globalConfig } from '../../services/config'

export class HttpClient {
  private baseUrl: string
  private token: string | null
  private headerProvider: HeaderProvider
  private requestExecutor: RequestExecutor

  constructor(
    baseUrl: string = '',
    token: string | null = null,
    headerProvider: HeaderProvider = new DefaultHeaderProvider(),
    requestExecutor: RequestExecutor = new FetchRequestExecutor()
  ) {
    this.baseUrl = baseUrl || globalConfig?.baseUrl || ''
    this.token = token || globalConfig?.sessionConfig?.token || null
    this.headerProvider = headerProvider
    this.requestExecutor = requestExecutor
  }

  public setToken(token: string): void {
    this.token = token
  }

  public clearToken(): void {
    this.token = null;
  }

  public async get<T>(url: string, dataVersion: string | null = null): Promise<T> {
    return this.request<T>(url, 'GET', dataVersion)
  }

  public async post<T>(url: string, data: any, dataVersion: string | null = null): Promise<T> {
    return this.request<T>(url, 'POST', dataVersion, data)
  }

  public async put<T>(url: string, data: any, dataVersion: string | null = null): Promise<T> {
    return this.request<T>(url, 'PUT', dataVersion, data)
  }

  public async patch<T>(url: string, data: any, dataVersion: string | null = null): Promise<T> {
    return this.request<T>(url, 'PATCH', dataVersion, data)
  }

  public async delete<T>(url: string, data: any = null, dataVersion: string | null = null): Promise<T> {
    return this.request<T>(url, 'DELETE', dataVersion, data)
  }

  private async request<T>(
    url: string,
    method: string,
    dataVersion: string | null = null,
    body: any = null
  ): Promise<T> {
    try {
      const headers = this.buildHeaders(dataVersion)
      const options = this.buildRequestOptions(method, headers, body)
      const fullUrl = this.resolveUrl(url)

      return await this.requestExecutor.execute<T>(fullUrl, options)
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

    // Add auth token if available (check both instance token and global config)
    const token = this.token || globalConfig?.sessionConfig?.token || null
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
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
      credentials: 'include',
    }

    if (body) {
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
      if (isFormData) {
        // Let browser set Content-Type with boundary for FormData
        delete options.headers['Content-Type']
        options.body = body
      } else {
        options.body = JSON.stringify(body)
      }
    }

    return options
  }

  private resolveUrl(url: string): string {
    const baseUrl = this.baseUrl || globalConfig?.baseUrl || ''
    return url.startsWith('/') ? baseUrl + url : url
  }

  private handleError(error: any, url: string, method: string): never {
    if ('status' in error) {
      // This is our formatted HTTP error from above
      throw error as HttpError
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

const httpClient = new HttpClient()

export const GET = httpClient.get.bind(httpClient)
export const POST = httpClient.post.bind(httpClient)
export const PUT = httpClient.put.bind(httpClient)
export const PATCH = httpClient.patch.bind(httpClient)
export const DELETE = httpClient.delete.bind(httpClient)

export const setHttpToken = (token: string): void => {
  httpClient.setToken(token)
}

export const clearHttpToken = (): void => {
  httpClient.clearToken()
}
