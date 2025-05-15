import { RequestExecutor } from '../interfaces/RequestExecutor'
import { RequestOptions } from '../interfaces/RequestOptions'
import { HttpError } from '../interfaces/HttpError'

export class FetchRequestExecutor implements RequestExecutor {
  async execute<T>(url: string, options: RequestOptions): Promise<T> {
    const response = await fetch(url, options)

    if (!response.ok) {
      throw await this.createHttpError(response, url, options.method)
    }

    return this.parseResponse<T>(response)
  }

  private async createHttpError(
    response: Response,
    url: string,
    method: string
  ): Promise<HttpError> {
    const error: HttpError = {
      status: response.status,
      statusText: response.statusText,
      url,
      method,
    }

    try {
      error.body = await response.json()
    } catch (e) {
      error.body = await response.text()
    }

    return error
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.indexOf('application/json') !== -1) {
      return (await response.json()) as T
    } else {
      return (await response.text()) as unknown as T
    }
  }
}
