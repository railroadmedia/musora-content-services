import baseConfig from './jest.config.js'
export default {
  ...baseConfig,
  testMatch: ['<rootDir>/test/integration/**/*.test.[jt]s?(x)'],
  coverageThreshold: {},
}
