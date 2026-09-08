jest.mock('@/services/sync/manager', () => ({ default: class SyncManager {} }))
jest.mock('@/services/sync/repository-proxy', () => ({ db: {} }))

import { Database } from '@nozbe/watermelondb'
import { makeDatabase, makeStore, resetDatabase } from '../../../unit/sync/helpers/index'
import LessonNote from '@/services/sync/models/LessonNote'
import LessonNotesRepository from '@/services/sync/repositories/lesson-notes'

let db: Database
let repo: LessonNotesRepository

beforeEach(() => {
  db = makeDatabase()
  const { store } = makeStore(LessonNote, db)
  repo = new LessonNotesRepository(store)
})

afterEach(async () => {
  await resetDatabase(db)
})

// ---

describe('createNote / getNotesForContent', () => {
  test('creates a note with the given fields', async () => {
    await repo.createNote(100, '2026-09-08', 'First note', 15000)

    const result = await repo.getNotesForContent(100)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].content_id).toBe(100)
    expect(result.data[0].date).toBe('2026-09-08')
    expect(result.data[0].notes).toBe('First note')
    expect(result.data[0].timestamp_ms).toBe(15000)
  })

  test('timestamp_ms defaults to null when omitted', async () => {
    await repo.createNote(100, '2026-09-08', 'No timestamp')

    const result = await repo.getNotesForContent(100)
    expect(result.data[0].timestamp_ms).toBeNull()
  })

  test('allows multiple notes on the same lesson', async () => {
    await repo.createNote(200, '2026-09-08', 'First')
    await repo.createNote(200, '2026-09-08', 'Second')

    const result = await repo.getNotesForContent(200)
    expect(result.data).toHaveLength(2)
  })

  test('only returns notes for the requested lesson', async () => {
    await repo.createNote(300, '2026-09-08', 'Belongs to 300')
    await repo.createNote(301, '2026-09-08', 'Belongs to 301')

    const result = await repo.getNotesForContent(300)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].notes).toBe('Belongs to 300')
  })
})

describe('updateNote / deleteNote', () => {
  test('updates only the note text', async () => {
    const created = await repo.createNote(400, '2026-09-08', 'Original', 5000)
    const id = created.data.id

    await repo.updateNote(id, 'Edited')

    const result = await repo.getNotesForContent(400)
    expect(result.data[0].notes).toBe('Edited')
    expect(result.data[0].timestamp_ms).toBe(5000)
  })

  test('deletes a note', async () => {
    const created = await repo.createNote(500, '2026-09-08', 'To delete')
    const id = created.data.id

    await repo.deleteNote(id)

    const result = await repo.getNotesForContent(500)
    expect(result.data).toHaveLength(0)
  })
})

describe('getContentIdsWithNotes', () => {
  test('returns distinct content ids that have at least one note', async () => {
    await repo.createNote(600, '2026-09-08', 'First')
    await repo.createNote(600, '2026-09-08', 'Second')
    await repo.createNote(601, '2026-09-08', 'Other lesson')

    const ids = await repo.getContentIdsWithNotes()
    expect(ids.sort()).toEqual([600, 601])
  })

  test('returns an empty array when there are no notes', async () => {
    const ids = await repo.getContentIdsWithNotes()
    expect(ids).toEqual([])
  })

  test('does not include a lesson after its only note is deleted', async () => {
    const created = await repo.createNote(700, '2026-09-08', 'Only note')
    await repo.deleteNote(created.data.id)

    const ids = await repo.getContentIdsWithNotes()
    expect(ids).toEqual([])
  })
})
