import { SanityQuery } from './SanityQuery'
import { SanityResponse } from './SanityResponse'
import { SanityConfig } from './SanityConfig'

export interface QueryExecutor {
  execute<T>(query: SanityQuery, config: SanityConfig): Promise<SanityResponse<T>>
}
