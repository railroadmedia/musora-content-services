import { ConfigProvider } from '../interfaces/ConfigProvider'
import { SanityConfig } from '../interfaces/SanityConfig'
import { globalConfig } from '../../../services/config.js'

export class DefaultConfigProvider implements ConfigProvider {
  getConfig(): SanityConfig {
    if (!globalConfig.sanityConfig) {
      throw new Error('Sanity configuration is not available in globalConfig')
    }

    const config = globalConfig.sanityConfig

    // Validate required fields
    if (!config.token) {
      throw new Error('Sanity token is missing in configuration')
    }
    if (!config.projectId) {
      throw new Error('Sanity projectId is missing in configuration')
    }
    if (!config.dataset) {
      throw new Error('Sanity dataset is missing in configuration')
    }
    if (!config.version) {
      throw new Error('Sanity version is missing in configuration')
    }

    return {
      projectId: config.projectId,
      dataset: config.dataset,
      version: config.version,
      token: config.token,
      perspective: (config as any).perspective ?? 'published',
      useCachedAPI: (config as any).useCachedAPI ?? false,
      debug: (config as any).debug ?? false,
    }
  }
} 