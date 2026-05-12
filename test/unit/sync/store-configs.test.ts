jest.mock('../../../src/services/sync/manager', () => ({ default: class SyncManager {} }))
jest.mock('../../../src/services/sync/repository-proxy', () => ({ db: {} }))
jest.mock('../../../src/services/sync/fetch', () => ({
  handlePull: jest.fn(() => jest.fn()),
  handlePush: jest.fn(() => jest.fn()),
  makeFetchRequest: jest.fn(() => jest.fn()),
}))
import createStoresFromConfig from '../../../src/services/sync/store-configs'
import ContentProgress from '../../../src/services/sync/models/ContentProgress'
describe('createStoresFromConfig', () => {
  const configs = createStoresFromConfig()
  const progressConfig = configs.find(c => c.model === ContentProgress)!
  const comparator = progressConfig.comparator!
  describe('ContentProgress comparator', () => {
    test('returns SERVER when server progress_percent is higher', () => {
      const result = comparator(
        { record: { progress_percent: 80 }, meta: { lifecycle: { updated_at: 1000 } } } as any,
        { progress_percent: 50, updated_at: 2000 } as any
      )
      expect(result).toBe('SERVER')
    })
    test('returns LOCAL when local progress_percent is higher', () => {
      const result = comparator(
        { record: { progress_percent: 50 }, meta: { lifecycle: { updated_at: 2000 } } } as any,
        { progress_percent: 80, updated_at: 1000 } as any
      )
      expect(result).toBe('LOCAL')
    })
    test('returns SERVER when server updated_at is newer and either side is 0', () => {
      const result = comparator(
        { record: { progress_percent: 0 }, meta: { lifecycle: { updated_at: 2000 } } } as any,
        { progress_percent: 50, updated_at: 1000 } as any
      )
      expect(result).toBe('SERVER')
    })
  })
})
