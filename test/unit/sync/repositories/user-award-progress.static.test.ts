jest.mock('../../../../src/services/sync/manager', () => ({ default: class SyncManager {} }))
jest.mock('../../../../src/services/sync/repository-proxy', () => ({ db: {} }))

import UserAwardProgressRepository from '../../../../src/services/sync/repositories/user-award-progress'

describe('UserAwardProgressRepository static methods', () => {
  describe('isCompleted', () => {
    test('returns true when completed_at is set and progress_percentage is 100', () => {
      const result = UserAwardProgressRepository.isCompleted({
        completed_at: '2024-01-01T00:00:00Z',
        progress_percentage: 100,
      })
      expect(result).toBe(true)
    })
    test('returns false when completed_at is null', () => {
      const result = UserAwardProgressRepository.isCompleted({
        completed_at: null,
        progress_percentage: 100,
      })
      expect(result).toBe(false)
    })
    test('returns false when progress_percentage is less than 100', () => {
      const result = UserAwardProgressRepository.isCompleted({
        completed_at: '2024-01-01T00:00:00Z',
        progress_percentage: 50,
      })
      expect(result).toBe(false)
    })
  })
  describe('isInProgress', () => {
    test('returns true when progress is greater than 0 and not completed', () => {
      const result = UserAwardProgressRepository.isInProgress({
        completed_at: null,
        progress_percentage: 50,
      })
      expect(result).toBe(true)
    })
    test('returns false when award is completed', () => {
      const result = UserAwardProgressRepository.isInProgress({
        completed_at: '2024-01-01T00:00:00Z',
        progress_percentage: 100,
      })
      expect(result).toBe(false)
    })
    test('returns true when progress is 0 and not completed', () => {
      const result = UserAwardProgressRepository.isInProgress({
        completed_at: null,
        progress_percentage: 0,
      })
      expect(result).toBe(true)
    })
  })
  describe('completedAtDate', () => {
    test('returns a Date object when completed_at is set', () => {
      const result = UserAwardProgressRepository.completedAtDate({
        completed_at: '2024-01-01T00:00:00Z',
      })
      expect(result).toBeInstanceOf(Date)
      expect(result?.toISOString()).toBe('2024-01-01T00:00:00.000Z')
    })
    test('returns null when completed_at is null', () => {
      const result = UserAwardProgressRepository.completedAtDate({
        completed_at: null,
      })
      expect(result).toBeNull()
    })
  })
})
