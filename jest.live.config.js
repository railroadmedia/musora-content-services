import baseConfig from './jest.config.js'
export default {
  ...baseConfig,
  testMatch: ['<rootDir>/test/live/**/*.test.[jt]s?(x)'],
  collectCoverage: false,
}
