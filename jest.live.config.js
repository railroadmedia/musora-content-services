/** @type {import('jest').Config} */
import baseConfig from './jest.config.js'

export default {
  ...baseConfig,
  modulePathIgnorePatterns: [],
  setupFilesAfterEnv: ['dotenv/config'],
  testTimeout: 1000000,
  collectCoverage: false,
}
