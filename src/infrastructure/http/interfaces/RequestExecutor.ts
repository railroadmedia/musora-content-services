import { RequestOptions } from './RequestOptions'

export interface RequestExecutor {
  execute<T>(url: string, options: RequestOptions): Promise<T>
}
