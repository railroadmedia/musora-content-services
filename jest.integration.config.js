import baseConfig from './jest.config.js'
export default {
  ...baseConfig,
  modulePathIgnorePatterns: [],
  testMatch: ['<rootDir>/test/integration/**/*.[jt]s?(x)'],
  collectCoverage: true,
}
