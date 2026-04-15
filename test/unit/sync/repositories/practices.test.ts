jest.mock('../../../../src/services/sync/manager', () => ({ default: class SyncManager {} }))
jest.mock('../../../../src/services/sync/repository-proxy', () => ({ db: {} }))

import { Database } from '@nozbe/watermelondb'
import { makeDatabase, makeStore, resetDatabase } from '../helpers/index'
import Practice from '../../../../src/services/sync/models/Practice'
import PracticesRepository from '../../../../src/services/sync/repositories/practices'

let db: Database
let repo: PracticesRepository

beforeEach(() => {
  db = makeDatabase()
  const { store } = makeStore(Practice, db)
  repo = new PracticesRepository(store)
})

afterEach(async () => {
  await resetDatabase(db)
})

// ---

describe('trackAutoPractice', () => {
  test('creates auto practice on first call', async () => {
    await repo.trackAutoPractice(100, '2024-01-15', 300)

    const result = await repo.getAutoPracticesOnDate('2024-01-15')
    expect(result.data).toHaveLength(1)
    expect(result.data[0].duration_seconds).toBe(300)
    expect(result.data[0].auto).toBe(true)
    expect(result.data[0].content_id).toBe(100)
  })

  test('increments duration on subsequent calls for same content/date', async () => {
    await repo.trackAutoPractice(100, '2024-01-15', 300)
    await repo.trackAutoPractice(100, '2024-01-15', 200)

    const result = await repo.getAutoPracticesOnDate('2024-01-15')
    expect(result.data).toHaveLength(1)
    expect(result.data[0].duration_seconds).toBe(500)
  })

  test('separate records for different dates', async () => {
    await repo.trackAutoPractice(100, '2024-01-15', 300)
    await repo.trackAutoPractice(100, '2024-01-16', 200)

    const day1 = await repo.getAutoPracticesOnDate('2024-01-15')
    const day2 = await repo.getAutoPracticesOnDate('2024-01-16')
    expect(day1.data).toHaveLength(1)
    expect(day2.data).toHaveLength(1)
    expect(day1.data[0].duration_seconds).toBe(300)
    expect(day2.data[0].duration_seconds).toBe(200)
  })

  test('caps duration at 59999 seconds', async () => {
    await repo.trackAutoPractice(100, '2024-01-15', 59990)
    await repo.trackAutoPractice(100, '2024-01-15', 100)

    const result = await repo.getAutoPracticesOnDate('2024-01-15')
    expect(result.data[0].duration_seconds).toBe(59999)
  })
})

describe('recordManualPractice', () => {
  test('creates manual practice with correct fields', async () => {
    await repo.recordManualPractice('2024-01-20', 1800, {
      title: 'Blues scales',
      instrument_id: 1,
      category_id: 2,
    })

    const result = await repo['store'].readAll()
    expect(result).toHaveLength(1)

    const practice = result[0]
    expect(practice.auto).toBe(false)
    expect(practice.date).toBe('2024-01-20')
    expect(practice.duration_seconds).toBe(1800)
    expect(practice.title).toBe('Blues scales')
    expect(practice.instrument_id).toBe(1)
    expect(practice.category_id).toBe(2)
    expect(practice.id.startsWith('manual:')).toBe(true)
  })

  test('caps duration at 59999 seconds', async () => {
    await repo.recordManualPractice('2024-01-20', 999999)

    const result = await repo['store'].readAll()
    expect(result[0].duration_seconds).toBe(59999)
  })

  test('multiple manual practices on same date create separate records', async () => {
    await repo.recordManualPractice('2024-01-20', 600)
    await repo.recordManualPractice('2024-01-20', 900)

    const result = await repo['store'].readAll()
    expect(result).toHaveLength(2)
    expect(result.every(r => r.auto === false)).toBe(true)
  })
})

describe('updateDetails', () => {
  test('updates duration and title', async () => {
    const created = await repo.recordManualPractice('2024-01-25', 600, { title: 'Old title' })
    const id = created.data.id

    await repo.updateDetails(id, { duration_seconds: 900, title: 'New title' })

    const record = await repo['store'].readOne(id)
    expect(record!.duration_seconds).toBe(900)
    expect(record!.title).toBe('New title')
  })

  test('preserves existing values when fields not provided', async () => {
    const created = await repo.recordManualPractice('2024-01-25', 600, {
      title: 'Keep me',
      category_id: 3,
    })
    const id = created.data.id

    await repo.updateDetails(id, { duration_seconds: 1200 })

    const record = await repo['store'].readOne(id)
    expect(record!.title).toBe('Keep me')
    expect(record!.category_id).toBe(3)
  })
})

describe('getAutoPracticesOnDate', () => {
  test('returns only auto practices for the given date', async () => {
    await repo.trackAutoPractice(100, '2024-02-01', 300)
    await repo.recordManualPractice('2024-02-01', 600)   // manual — should not appear

    const result = await repo.getAutoPracticesOnDate('2024-02-01')
    expect(result.data).toHaveLength(1)
    expect(result.data[0].auto).toBe(true)
  })

  test('returns empty array when no practices on date', async () => {
    const result = await repo.getAutoPracticesOnDate('2099-01-01')
    expect(result.data).toHaveLength(0)
  })
})

describe('sumPracticeMinutesForContent', () => {
  test('sums across multiple practice records', async () => {
    await repo.trackAutoPractice(200, '2024-01-01', 600)   // 10 min
    await repo.trackAutoPractice(200, '2024-01-02', 900)   // 15 min

    const minutes = await repo.sumPracticeMinutesForContent([200])
    expect(minutes).toBe(25)
  })

  test('sums only for specified contentIds', async () => {
    await repo.trackAutoPractice(300, '2024-01-01', 600)
    await repo.trackAutoPractice(301, '2024-01-01', 600)

    const minutes = await repo.sumPracticeMinutesForContent([300])
    expect(minutes).toBe(10)
  })

  test('returns 0 for empty contentIds array', async () => {
    const minutes = await repo.sumPracticeMinutesForContent([])
    expect(minutes).toBe(0)
  })

  test('returns 0 when no practices for contentIds', async () => {
    const minutes = await repo.sumPracticeMinutesForContent([9999])
    expect(minutes).toBe(0)
  })

  test('rounds to nearest minute', async () => {
    await repo.trackAutoPractice(400, '2024-01-01', 90)  // 1.5 min → rounds to 2

    const minutes = await repo.sumPracticeMinutesForContent([400])
    expect(minutes).toBe(2)
  })
})
