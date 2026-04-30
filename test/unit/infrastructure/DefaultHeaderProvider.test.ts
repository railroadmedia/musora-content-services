import { DefaultHeaderProvider } from '../../../src/infrastructure/http/providers/DefaultHeaderProvider'
import { globalConfig } from '../../../src/services/config.js'
jest.mock('../../../src/services/config.js', () => ({
  globalConfig: {
    localTimezoneString: null,
    isMA: false,
  }
}))
describe('DefaultHeaderProvider', () => {
  let provider: DefaultHeaderProvider
  beforeEach(() => {
    provider = new DefaultHeaderProvider()
    globalConfig.localTimezoneString = null
    globalConfig.isMA = false
  })
  test('always includes Content-Type and Accept headers', () => {
    const headers = provider.getHeaders()
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['Accept']).toBe('application/json')
  })
  test('adds M-Client-Timezone header when localTimezoneString is set', () => {
    globalConfig.localTimezoneString = 'America/Vancouver'
    const headers = provider.getHeaders()
    expect(headers['M-Client-Timezone']).toBe('America/Vancouver')
  })
  test('omits M-Client-Timezone header when localTimezoneString is not set', () => {
    const headers = provider.getHeaders()
    expect(headers['M-Client-Timezone']).toBeUndefined()
  })
  test('adds X-Client-Platform header when isMA is true', () => {
    globalConfig.isMA = true
    const headers = provider.getHeaders()
    expect(headers['X-Client-Platform']).toBe('mobile')
  })
  test('omits X-Client-Platform header when isMA is false', () => {
    const headers = provider.getHeaders()
    expect(headers['X-Client-Platform']).toBeUndefined()
  })
})
