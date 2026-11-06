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

  test('optionally scopes to a specific day', async () => {
    await repo.createNote(310, '2026-09-01', 'From Sept 1')
    await repo.createNote(310, '2026-09-08', 'From Sept 8')

    const result = await repo.getNotesForContent(310, '2026-09-01')
    expect(result.data).toHaveLength(1)
    expect(result.data[0].notes).toBe('From Sept 1')
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

describe('observeNotesForContent', () => {
  const observe = (contentId: number) => {
    const emissions: string[][] = []
    const stop = repo.observeNotesForContent(contentId, (notes) => {
      emissions.push(notes.map((note) => note.notes))
    })
    return { emissions, stop }
  }

  const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

  test('emits the lesson notes right away, oldest first', async () => {
    await repo.createNote(900, '2026-09-08', 'First')
    await settle()
    await repo.createNote(900, '2026-09-08', 'Second')

    const { emissions, stop } = observe(900)
    await settle()

    expect(emissions.at(-1)).toEqual(['First', 'Second'])
    stop()
  })

  test('emits the same plain notes getNotesForContent returns', async () => {
    await repo.createNote(907, '2026-09-08', 'Plain', 5000)
    const emitted: unknown[][] = []
    const stop = repo.observeNotesForContent(907, (notes) => emitted.push(notes))
    await settle()

    const result = await repo.getNotesForContent(907)
    expect(emitted.at(-1)).toEqual(result.data)
    stop()
  })

  test('emits again when a note is added', async () => {
    const { emissions, stop } = observe(901)
    await settle()

    await repo.createNote(901, '2026-09-08', 'New')
    await settle()

    expect(emissions.at(-1)).toEqual(['New'])
    stop()
  })

  test('emits again when a note text is edited', async () => {
    const created = await repo.createNote(902, '2026-09-08', 'Original')
    const { emissions, stop } = observe(902)
    await settle()

    await repo.updateNote(created.data.id, 'Edited')
    await settle()

    expect(emissions.at(-1)).toEqual(['Edited'])
    stop()
  })

  test('emits again when a note is deleted', async () => {
    const created = await repo.createNote(903, '2026-09-08', 'To delete')
    const { emissions, stop } = observe(903)
    await settle()

    await repo.deleteNote(created.data.id)
    await settle()

    expect(emissions.at(-1)).toEqual([])
    stop()
  })

  test('ignores notes on other lessons', async () => {
    const { emissions, stop } = observe(904)
    await settle()
    const emissionCount = emissions.length

    await repo.createNote(905, '2026-09-08', 'Other lesson')
    await settle()

    expect(emissions).toHaveLength(emissionCount)
    expect(emissions.at(-1)).toEqual([])
    stop()
  })

  test('stops emitting once stopped', async () => {
    const { emissions, stop } = observe(906)
    await settle()
    stop()
    const emissionCount = emissions.length

    await repo.createNote(906, '2026-09-08', 'After stop')
    await settle()

    expect(emissions).toHaveLength(emissionCount)
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

  test('does not include a lesson whose notes have no visible text', async () => {
    await repo.createNote(800, '2026-09-08', '<p><br></p>')
    await repo.createNote(801, '2026-09-08', '<p>Has text</p>')

    const ids = await repo.getContentIdsWithNotes()
    expect(ids).toEqual([801])
  })
})
