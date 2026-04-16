jest.mock('@/services/sync/manager', () => ({ default: class SyncManager {} }))
jest.mock('@/services/sync/repository-proxy', () => ({ db: {} }))
jest.mock('../../../../src/services/awards/internal/award-definitions', () => ({
  awardDefinitions: {
    getByContentId: jest.fn(),
    getByContentIds: jest.fn(),
  },
}))

import { Database } from '@nozbe/watermelondb'
import { makeDatabase, makeStore, resetDatabase } from '../helpers/index'
import UserAwardProgress from '@/services/sync/models/UserAwardProgress'
import UserAwardProgressRepository from '@/services/sync/repositories/user-award-progress'
import type { CompletionData, AwardDefinition } from '../../../../src/services/awards/types'

let db: Database
let repo: UserAwardProgressRepository

const COMPLETION_DATA: CompletionData = {
  content_title: 'Test Course',
  completed_at: '2024-01-15T10:00:00.000Z',
  days_user_practiced: 30,
  practice_minutes: 600,
}

function upsertAward(
  awardId: string,
  progressPct: number,
  overrides: Partial<{
    completedAt: string | null
    completionData: CompletionData | null
    progressData: any
  }> = {}
) {
  return repo['store'].upsertOne(awardId, r => {
    r.award_id = awardId
    r.progress_percentage = progressPct
    if (overrides.completedAt !== undefined) {
      r.completed_at = overrides.completedAt
    }
    if (overrides.completionData !== undefined) {
      r.completion_data = overrides.completionData
    }
    if (overrides.progressData !== undefined) {
      r.progress_data = overrides.progressData
    }
  })
}

beforeEach(() => {
  db = makeDatabase()
  const { store } = makeStore(UserAwardProgress, db)
  repo = new UserAwardProgressRepository(store)
})

afterEach(async () => {
  await resetDatabase(db)
})

// ---

describe('static helpers', () => {
  test('isCompleted returns true when completed_at set and progress is 100', () => {
    expect(UserAwardProgressRepository.isCompleted({
      completed_at: '2024-01-15T10:00:00.000Z',
      progress_percentage: 100,
    })).toBe(true)
  })

  test('isCompleted returns false when progress is 100 but completed_at is null', () => {
    expect(UserAwardProgressRepository.isCompleted({
      completed_at: null,
      progress_percentage: 100,
    })).toBe(false)
  })

  test('isCompleted returns false when completed_at set but progress is not 100', () => {
    expect(UserAwardProgressRepository.isCompleted({
      completed_at: '2024-01-15T10:00:00.000Z',
      progress_percentage: 50,
    })).toBe(false)
  })

  test('isInProgress returns true when progress >= 0 and not completed', () => {
    expect(UserAwardProgressRepository.isInProgress({
      completed_at: null,
      progress_percentage: 50,
    })).toBe(true)
  })

  test('isInProgress returns false when completed', () => {
    expect(UserAwardProgressRepository.isInProgress({
      completed_at: '2024-01-15T10:00:00.000Z',
      progress_percentage: 100,
    })).toBe(false)
  })

  test('completedAtDate returns Date for valid ISO string', () => {
    const result = UserAwardProgressRepository.completedAtDate({
      completed_at: '2024-01-15T10:00:00.000Z',
    })
    expect(result).toBeInstanceOf(Date)
    expect(result!.getFullYear()).toBe(2024)
  })

  test('completedAtDate returns null when completed_at is null', () => {
    expect(UserAwardProgressRepository.completedAtDate({ completed_at: null })).toBeNull()
  })
})

// ---

describe('getAll', () => {
  test('returns all records', async () => {
    await upsertAward('award-1', 50)
    await upsertAward('award-2', 100, { completedAt: '2024-01-15T10:00:00.000Z' })

    const result = await repo.getAll()
    expect(result.data).toHaveLength(2)
  })

  test('onlyCompleted filters to completed records', async () => {
    await upsertAward('award-1', 50)
    await upsertAward('award-2', 100, { completedAt: '2024-01-15T10:00:00.000Z' })
    await upsertAward('award-3', 100, { completedAt: '2024-01-16T10:00:00.000Z' })

    const result = await repo.getAll({ onlyCompleted: true })
    expect(result.data).toHaveLength(2)
    expect(result.data.every(r => r.completed_at !== null)).toBe(true)
  })

  test('respects limit', async () => {
    await Promise.all(['a', 'b', 'c', 'd'].map(id => upsertAward(id, 50)))

    const result = await repo.getAll({ limit: 2 })
    expect(result.data).toHaveLength(2)
  })

  test('returns empty when no records', async () => {
    const result = await repo.getAll()
    expect(result.data).toHaveLength(0)
  })
})

// ---

describe('getCompleted', () => {
  test('returns only records with completed_at set', async () => {
    await upsertAward('award-1', 50)
    await upsertAward('award-2', 100, { completedAt: '2024-01-15T10:00:00.000Z' })

    const result = await repo.getCompleted()
    expect(result.data).toHaveLength(1)
    expect(result.data[0].award_id).toBe('award-2')
  })

  test('respects limit', async () => {
    await upsertAward('award-1', 100, { completedAt: '2024-01-15T10:00:00.000Z' })
    await upsertAward('award-2', 100, { completedAt: '2024-01-16T10:00:00.000Z' })
    await upsertAward('award-3', 100, { completedAt: '2024-01-17T10:00:00.000Z' })

    const result = await repo.getCompleted(2)
    expect(result.data).toHaveLength(2)
  })
})

// ---

describe('getInProgress', () => {
  test('returns records with progress > 0 and no completed_at', async () => {
    await upsertAward('in-progress', 50)
    await upsertAward('completed', 100, { completedAt: '2024-01-15T10:00:00.000Z' })
    await upsertAward('not-started', 0)

    const result = await repo.getInProgress()
    const ids = result.data.map(r => r.award_id)
    expect(ids).toContain('in-progress')
    expect(ids).not.toContain('completed')
    expect(ids).not.toContain('not-started')
  })

  test('respects limit', async () => {
    await Promise.all(['a', 'b', 'c'].map(id => upsertAward(id, 50)))

    const result = await repo.getInProgress(2)
    expect(result.data).toHaveLength(2)
  })
})

// ---

describe('getByAwardId / getByAwardIds', () => {
  test('getByAwardId returns matching record', async () => {
    await upsertAward('award-abc', 75)

    const result = await repo.getByAwardId('award-abc')
    expect(result.data).not.toBeNull()
    expect(result.data!.award_id).toBe('award-abc')
  })

  test('getByAwardId returns null for missing id', async () => {
    const result = await repo.getByAwardId('nonexistent')
    expect(result.data).toBeNull()
  })

  test('getByAwardIds returns all matching records', async () => {
    await upsertAward('award-1', 25)
    await upsertAward('award-2', 50)
    await upsertAward('award-3', 75)

    const result = await repo.getByAwardIds(['award-1', 'award-3'])
    expect(result.data).toHaveLength(2)
    expect(result.data.map(r => r.award_id).sort()).toEqual(['award-1', 'award-3'])
  })

  test('getByAwardIds returns empty for empty input', async () => {
    const result = await repo.getByAwardIds([])
    expect(result.data).toHaveLength(0)
  })
})

// ---

describe('hasCompletedAward', () => {
  test('returns true when award is completed', async () => {
    await upsertAward('award-done', 100, { completedAt: '2024-01-15T10:00:00.000Z' })

    expect(await repo.hasCompletedAward('award-done')).toBe(true)
  })

  test('returns false when award has progress but not completed', async () => {
    await upsertAward('award-partial', 80)

    expect(await repo.hasCompletedAward('award-partial')).toBe(false)
  })

  test('returns false when progress is 100 but completed_at is null', async () => {
    await upsertAward('award-no-date', 100)

    expect(await repo.hasCompletedAward('award-no-date')).toBe(false)
  })

  test('returns false when award does not exist', async () => {
    expect(await repo.hasCompletedAward('nonexistent')).toBe(false)
  })
})

// ---

describe('recordAwardProgress', () => {
  test('creates record with progress percentage', async () => {
    await repo.recordAwardProgress('award-x', 60)

    const result = await repo.getByAwardId('award-x')
    expect(result.data!.progress_percentage).toBe(60)
    expect(result.data!.award_id).toBe('award-x')
  })

  test('sets completedAt when provided', async () => {
    const completedAt = '2024-06-01T12:00:00.000Z'
    await repo.recordAwardProgress('award-x', 100, { completedAt })

    const result = await repo.getByAwardId('award-x')
    expect(result.data!.completed_at).toBe(completedAt)
  })

  test('sets completionData when provided', async () => {
    await repo.recordAwardProgress('award-x', 100, {
      completedAt: COMPLETION_DATA.completed_at,
      completionData: COMPLETION_DATA,
    })

    const result = await repo.getByAwardId('award-x')
    expect(result.data!.completion_data).toEqual(COMPLETION_DATA)
  })

  test('sets progressData when provided', async () => {
    const progressData = { lesson_ids: [1, 2, 3], current: 2 }
    await repo.recordAwardProgress('award-x', 50, { progressData })

    const result = await repo.getByAwardId('award-x')
    expect(result.data!.progress_data).toEqual(progressData)
  })

  test('updates existing record on second call', async () => {
    await repo.recordAwardProgress('award-x', 40)
    await repo.recordAwardProgress('award-x', 80)

    const result = await repo.getByAwardId('award-x')
    expect(result.data!.progress_percentage).toBe(80)
  })
})

// ---

describe('completeAward', () => {
  test('sets progress to 100 and records completionData', async () => {
    await repo.completeAward('award-x', COMPLETION_DATA)

    const result = await repo.getByAwardId('award-x')
    expect(result.data!.progress_percentage).toBe(100)
    expect(result.data!.completion_data).toEqual(COMPLETION_DATA)
  })

  test('sets completed_at to an ISO date string', async () => {
    const before = new Date().toISOString()
    await repo.completeAward('award-x', COMPLETION_DATA)
    const after = new Date().toISOString()

    const result = await repo.getByAwardId('award-x')
    const completedAt = result.data!.completed_at!
    expect(completedAt >= before).toBe(true)
    expect(completedAt <= after).toBe(true)
  })

  test('hasCompletedAward returns true after completeAward', async () => {
    await repo.completeAward('award-x', COMPLETION_DATA)
    expect(await repo.hasCompletedAward('award-x')).toBe(true)
  })
})

// ---

describe('getAwardsForContent', () => {
  test('returns definitions and matching progress map', async () => {
    const { awardDefinitions } = await import('../../../../src/services/awards/internal/award-definitions')
    const mockDefinitions: AwardDefinition[] = [
      { _id: 'award-1', name: 'Test Award', content_id: 100, is_active: true, logo: null, badge: null, badge_rear: null, award: 'completion', content_type: 'lesson', type: 'course-completion', brand: 'drumeo', content_title: 'Test', award_custom_text: null, instructor_name: null, child_ids: [] },
    ]
    ;(awardDefinitions.getByContentId as jest.Mock).mockResolvedValue(mockDefinitions)

    await upsertAward('award-1', 50)

    const result = await repo.getAwardsForContent(100)
    expect(result.definitions).toEqual(mockDefinitions)
    expect(result.progress.get('award-1')).toBeDefined()
    expect(result.progress.get('award-1')!.progress_percentage).toBe(50)
  })

  test('returns empty progress map when no progress recorded', async () => {
    const { awardDefinitions } = await import('../../../../src/services/awards/internal/award-definitions')
    ;(awardDefinitions.getByContentId as jest.Mock).mockResolvedValue([
      { _id: 'award-1', name: 'Test Award', content_id: 100, is_active: true, logo: null, badge: null, badge_rear: null, award: 'completion', content_type: 'lesson', type: 'course-completion', brand: 'drumeo', content_title: 'Test', award_custom_text: null, instructor_name: null, child_ids: [] },
    ])

    const result = await repo.getAwardsForContent(100)
    expect(result.definitions).toHaveLength(1)
    expect(result.progress.size).toBe(0)
  })
})

// ---

describe('getAwardsForContentMany', () => {
  test('returns map keyed by contentId with definitions and progress', async () => {
    const { awardDefinitions } = await import('../../../../src/services/awards/internal/award-definitions')
    const defsByContent = new Map([
      [100, [{ _id: 'award-100', name: 'Award 100', content_id: 100, is_active: true, logo: null, badge: null, badge_rear: null, award: 'completion', content_type: 'lesson', type: 'course-completion', brand: 'drumeo', content_title: 'Course 100', award_custom_text: null, instructor_name: null, child_ids: [] }]],
      [200, [{ _id: 'award-200', name: 'Award 200', content_id: 200, is_active: true, logo: null, badge: null, badge_rear: null, award: 'completion', content_type: 'lesson', type: 'course-completion', brand: 'drumeo', content_title: 'Course 200', award_custom_text: null, instructor_name: null, child_ids: [] }]],
    ])
    ;(awardDefinitions.getByContentIds as jest.Mock).mockResolvedValue(defsByContent)

    await upsertAward('award-100', 75)

    const result = await repo.getAwardsForContentMany([100, 200])
    expect(result.size).toBe(2)
    expect(result.get(100)!.progress.get('award-100')!.progress_percentage).toBe(75)
    expect(result.get(200)!.progress.size).toBe(0)
  })
})

// ---

describe('deleteAllAwards', () => {
  test('returns deletedCount of 0 when no awards', async () => {
    const result = await repo.deleteAllAwards()
    expect(result.deletedCount).toBe(0)
  })

  test('returns correct deletedCount', async () => {
    await upsertAward('award-1', 50)
    await upsertAward('award-2', 100, { completedAt: '2024-01-15T10:00:00.000Z' })

    const result = await repo.deleteAllAwards()
    expect(result.deletedCount).toBe(2)
  })
})
