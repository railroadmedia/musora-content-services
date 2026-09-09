jest.mock('@/services/sync/manager', () => ({ default: class SyncManager {} }))
jest.mock('@/services/sync/repository-proxy', () => ({ db: {} }))

import { Database } from '@nozbe/watermelondb'
import { makeDatabase, makeStore, resetDatabase } from '../../../unit/sync/helpers/index'
import LessonNote from '@/services/sync/models/LessonNote'
import LessonNotesRepository from '@/services/sync/repositories/lesson-notes'

let db: Database
let repo: LessonNotesRepository
let connectivity: { setOnline: (online: boolean) => void }
let push: jest.Mock

beforeEach(() => {
  db = makeDatabase()
  push = jest.fn().mockRejectedValue(new Error('network unreachable'))
  const setup = makeStore(LessonNote, db, { push })
  repo = new LessonNotesRepository(setup.store)
  connectivity = setup.context.connectivity as unknown as { setOnline: (online: boolean) => void }
})

afterEach(async () => {
  connectivity.setOnline(true)
  await resetDatabase(db)
})

// ---

describe('writing lesson notes while offline', () => {
  beforeEach(() => connectivity.setOnline(false))

  test('createNote resolves without throwing, even though the push is rejected', async () => {
    const result = await repo.createNote(100, '2026-09-09', 'Written offline')

    expect(result.status).toBe('unsynced')
    expect(result.pushStatus).toBe('pending')
  })

  test('updateNote and deleteNote also resolve without throwing', async () => {
    connectivity.setOnline(true)
    const created = await repo.createNote(200, '2026-09-09', 'Original')
    connectivity.setOnline(false)

    const updated = await repo.updateNote(created.data.id, 'Edited offline')
    expect(updated.status).toBe('unsynced')

    const deleted = await repo.deleteNote(created.data.id)
    expect(deleted.status).toBe('unsynced')
  })
})

describe('reading lesson notes while offline', () => {
  test('throws if the table has never been pulled — offline is not enough on its own', async () => {
    connectivity.setOnline(false)

    await expect(repo.getNotesForContent(300)).rejects.toThrow('Failed to pull records')
  })

  test('works locally once the table has been pulled at least once before going offline', async () => {
    // establishes everPulled=true via the default (successful) pull mock, while online
    await repo.getNotesForContent(400)
    await repo.createNote(400, '2026-09-09', 'Written after the initial pull')

    connectivity.setOnline(false)

    const notes = await repo.getNotesForContent(400)
    expect(notes.data).toHaveLength(1)
    expect(notes.data[0].notes).toBe('Written after the initial pull')
  })
})
