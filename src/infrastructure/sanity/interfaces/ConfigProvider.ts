import { SanityConfig } from './SanityConfig'

export interface ConfigProvider {
  getConfig(): SanityConfig
} 