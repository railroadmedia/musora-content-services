import { DefaultConfigProvider } from '../../../../src/infrastructure/sanity/providers/DefaultConfigProvider'
import { globalConfig } from '../../../../src/services/config.js'

jest.mock('../../../../src/services/config.js', () => ({
  globalConfig: {
    sanityConfig: null,
  },
}))

describe('DefaultConfigProvider', () => {
  let provider: DefaultConfigProvider

  beforeEach(() => {
    provider = new DefaultConfigProvider()
    ;(globalConfig as any).sanityConfig = null
  })

  test('throws when sanityConfig is missing from globalConfig', () => {
    ;(globalConfig as any).sanityConfig = null
    expect(() => provider.getConfig()).toThrow('Sanity configuration is not available in globalConfig')
  })

  test('throws when token is missing', () => {
    ;(globalConfig as any).sanityConfig = {
      projectId: 'p',
      dataset: 'd',
      version: 'v',
    }
    expect(() => provider.getConfig()).toThrow('Sanity token is missing in configuration')
  })

  test('throws when projectId is missing', () => {
    ;(globalConfig as any).sanityConfig = {
      token: 't',
      dataset: 'd',
      version: 'v',
    }
    expect(() => provider.getConfig()).toThrow('Sanity projectId is missing in configuration')
  })

  test('throws when dataset is missing', () => {
    ;(globalConfig as any).sanityConfig = {
      token: 't',
      projectId: 'p',
      version: 'v',
    }
    expect(() => provider.getConfig()).toThrow('Sanity dataset is missing in configuration')
  })

  test('throws when version is missing', () => {
    ;(globalConfig as any).sanityConfig = {
      token: 't',
      projectId: 'p',
      dataset: 'd',
    }
    expect(() => provider.getConfig()).toThrow('Sanity version is missing in configuration')
  })

  test('returns config with defaults when optional fields are absent', () => {
    ;(globalConfig as any).sanityConfig = {
      token: 't',
      projectId: 'p',
      dataset: 'd',
      version: '2021-06-07',
    }
    const config = provider.getConfig()
    expect(config).toEqual({
      projectId: 'p',
      dataset: 'd',
      version: '2021-06-07',
      token: 't',
      perspective: 'published',
      useCachedAPI: false,
      debug: false,
    })
  })

  test('passes through optional perspective, useCachedAPI, debug', () => {
    ;(globalConfig as any).sanityConfig = {
      token: 't',
      projectId: 'p',
      dataset: 'd',
      version: '2021-06-07',
      perspective: 'previewDrafts',
      useCachedAPI: true,
      debug: true,
    }
    const config = provider.getConfig()
    expect(config.perspective).toBe('previewDrafts')
    expect(config.useCachedAPI).toBe(true)
    expect(config.debug).toBe(true)
  })
})
