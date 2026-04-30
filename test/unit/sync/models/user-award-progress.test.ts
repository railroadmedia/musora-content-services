jest.mock('../../../../src/services/sync/manager', () => ({ default: class SyncManager {} }))
jest.mock('../../../../src/services/sync/repository-proxy', () => ({ db: {} }))

import { Database } from '@nozbe/watermelondb'
import { makeDatabase, makeStore, resetDatabase } from '../helpers/index'
import UserAwardProgress from '../../../../src/services/sync/models/UserAwardProgress'
import UserAwardProgressRepository from '../../../../src/services/sync/repositories/user-award-progress'
let db: Database
let repo: UserAwardProgressRepository
beforeEach(() => {
  db = makeDatabase()
  const { store } = makeStore(UserAwardProgress, db)
  repo = new UserAwardProgressRepository(store)
})
afterEach(async () => {
  await resetDatabase(db)
})
describe('UserAwardProgress model', () => {
  describe('getters', () => {
    test('award_id returns raw string value', async () => {
      await repo.recordAwardProgress('test-award-id', 50)
      const result = await repo.getByAwardId('test-award-id')
      expect(result.data?.award_id).toBe('test-award-id')
    })
    test('progress_percentage returns raw number value', async () => {
      await repo.recordAwardProgress('test-award-id', 75)
      const result = await repo.getByAwardId('test-award-id')
      expect(result.data?.progress_percentage).toBe(75)
    })
    test('completed_at returns null when not set', async () => {
      await repo.recordAwardProgress('test-award-id', 50)
      const result = await repo.getByAwardId('test-award-id')
      expect(result.data?.completed_at).toBeNull()
    })
    test('progress_data parses JSON when set', async () => {
      const progressData = { step: 1, total: 5 }
      await repo.recordAwardProgress('test-award-id', 50, { progressData })
      const result = await repo.getByAwardId('test-award-id')
      expect(result.data?.progress_data).toEqual(progressData)
    })
    test('progress_data returns null when not set', async () => {
      await repo.recordAwardProgress('test-award-id', 50)
      const result = await repo.getByAwardId('test-award-id')
      expect(result.data?.progress_data).toBeNull()
    })
    test('completion_data parses JSON when set', async () => {
      const completionData = {
        content_title: 'Blues Foundations',
        completed_at: '2024-01-01T00:00:00Z',
        days_user_practiced: 14,
        practice_minutes: 180,
      }
      await repo.recordAwardProgress('test-award-id', 100, { completionData })
      const result = await repo.getByAwardId('test-award-id')
      expect(result.data?.completion_data).toEqual(completionData)
    })
    test('completion_data returns null when not set', async () => {
      await repo.recordAwardProgress('test-award-id', 50)
      const result = await repo.getByAwardId('test-award-id')
      expect(result.data?.completion_data).toBeNull()
    })
  })
  describe('setters via validators', () => {
    test.todo('progress_percentage throws SyncValidationError when value exceeds 100')
    test('completed_at accepts null', async () => {
      await repo.recordAwardProgress('test-award-id', 50, { completedAt: null })
      const result = await repo.getByAwardId('test-award-id')
      expect(result.data?.completed_at).toBeNull()
    })
    test('completion_data serialises to JSON when set', async () => {
      const completionData = {
        content_title: 'Test',
        completed_at: '2024-01-01T00:00:00Z',
        days_user_practiced: 5,
        practice_minutes: 60,
      }
      await repo.recordAwardProgress('test-award-id', 100, { completionData })
      const result = await repo.getByAwardId('test-award-id')
      expect(result.data?.completion_data).toEqual(completionData)
    })
  })
})
