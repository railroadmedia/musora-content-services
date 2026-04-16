import { Database } from '@nozbe/watermelondb'
import { makeTelemetry, makeContext, makeUserScope, makePullMock, makePushMock } from '../helpers/index'
import TestModel, { makeTestDatabase } from '../helpers/TestModel'
import SyncStore from '@/services/sync/store/index'
import SyncRetry from '@/services/sync/retry'
import SyncRunScope from '@/services/sync/run-scope'

let db: Database

function makeStore(overrides: { pull?: any; push?: any } = {}) {
  const userScope = makeUserScope()
  const context = makeContext()
  const telemetry = makeTelemetry(userScope)
  const retry = new SyncRetry(context, telemetry)
  const runScope = new SyncRunScope()

  const store = new SyncStore<TestModel>(
    {
      model: TestModel,
      pull: overrides.pull ?? makePullMock(),
      push: overrides.push ?? makePushMock(),
    },
    userScope,
    context,
    db,
    retry,
    runScope,
    telemetry
  )

  return store
}

beforeEach(() => {
  db = makeTestDatabase()
})

afterEach(async () => {
  await db.write(async () => db.unsafeResetDatabase())
})

// ---

describe('upsert', () => {
  test('insertOne creates record', async () => {
    const store = makeStore()
    const result = await store.insertOne(r => { r.value = 'hello'; r.score = 5 })
    store.destroy()

    expect(result.value).toBe('hello')
    expect(result.score).toBe(5)
    expect(typeof result.id).toBe('string')
  })

  test('upsertOne creates when absent', async () => {
    const store = makeStore()
    await store.upsertOne('rec-1', r => { r.value = 'first'; r.score = 1 })
    const record = await store.readOne('rec-1')
    store.destroy()

    expect(record).not.toBeNull()
    expect(record!.value).toBe('first')
  })

  test('upsertOne updates existing record', async () => {
    const store = makeStore()
    await store.upsertOne('rec-2', r => { r.value = 'original'; r.score = 10 })
    await store.upsertOne('rec-2', r => { r.value = 'updated'; r.score = 20 })
    const record = await store.readOne('rec-2')
    store.destroy()

    expect(record!.value).toBe('updated')
    expect(record!.score).toBe(20)
  })

  test('upsertSome creates multiple records in one batch', async () => {
    const store = makeStore()
    await store.upsertSome({
      'a': r => { r.value = 'a'; r.score = 1 },
      'b': r => { r.value = 'b'; r.score = 2 },
      'c': r => { r.value = 'c'; r.score = 3 },
    })
    const all = await store.readAll()
    store.destroy()

    expect(all).toHaveLength(3)
    expect(all.map(r => r.value).sort()).toEqual(['a', 'b', 'c'])
  })

  test('upsertSome no-ops on empty object', async () => {
    const store = makeStore()
    const result = await store.upsertSome({})
    store.destroy()

    expect(result).toEqual([])
  })

  test('upsertOne over deleted tombstone recreates the record', async () => {
    const store = makeStore()
    await store.upsertOne('tomb-1', r => { r.value = 'original'; r.score = 1 })
    await store.deleteOne('tomb-1')
    expect(await store.readOne('tomb-1')).toBeNull()

    await store.upsertOne('tomb-1', r => { r.value = 'resurrected'; r.score = 2 })
    const record = await store.readOne('tomb-1')
    store.destroy()

    expect(record).not.toBeNull()
    expect(record!.value).toBe('resurrected')
    expect(record!.score).toBe(2)
  })
})

describe('updateOneId', () => {
  test('updates existing record fields', async () => {
    const store = makeStore()
    await store.upsertOne('upd-1', r => { r.value = 'original'; r.score = 10 })
    await store.updateOneId('upd-1', r => { r.value = 'changed'; r.score = 99 })
    const record = await store.readOne('upd-1')
    store.destroy()

    expect(record!.value).toBe('changed')
    expect(record!.score).toBe(99)
  })

  test('throws SyncError when record does not exist', async () => {
    const store = makeStore()

    await expect(store.updateOneId('ghost', r => { r.value = 'x' })).rejects.toThrow('Record not found')
    store.destroy()
  })

  test('fires upserted event', async () => {
    const store = makeStore()
    await store.upsertOne('upd-evt', r => { r.value = 'v'; r.score = 0 })
    const handler = jest.fn()
    store.on('upserted', handler)
    await store.updateOneId('upd-evt', r => { r.value = 'updated' })
    store.destroy()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0][0].value).toBe('updated')
  })
})

describe('delete / restore', () => {
  test('deleteOne hides record from readAll', async () => {
    const store = makeStore()
    await store.upsertSome({
      'keep': r => { r.value = 'keep'; r.score = 1 },
      'delete-me': r => { r.value = 'gone'; r.score = 2 },
    })
    await store.deleteOne('delete-me')
    const all = await store.readAll()
    store.destroy()

    expect(all).toHaveLength(1)
    expect(all[0].value).toBe('keep')
  })

  test('deleteOne on non-existent record creates tombstone without throwing', async () => {
    const store = makeStore()
    await expect(store.deleteOne('ghost')).resolves.toBe('ghost')
    store.destroy()
  })

  test('restoreOne makes deleted record visible again', async () => {
    const store = makeStore()
    await store.upsertOne('restore-me', r => { r.value = 'alive'; r.score = 7 })
    await store.deleteOne('restore-me')
    expect(await store.readOne('restore-me')).toBeNull()

    await store.restoreOne('restore-me')
    const restored = await store.readOne('restore-me')
    store.destroy()

    expect(restored).not.toBeNull()
    expect(restored!.value).toBe('alive')
  })

  test('deleteSome removes multiple records', async () => {
    const store = makeStore()
    await store.upsertSome({
      'x': r => { r.value = 'x'; r.score = 1 },
      'y': r => { r.value = 'y'; r.score = 2 },
      'z': r => { r.value = 'z'; r.score = 3 },
    })
    await store.deleteSome(['x', 'z'])
    const all = await store.readAll()
    store.destroy()

    expect(all).toHaveLength(1)
    expect(all[0].value).toBe('y')
  })
})

describe('read / query', () => {
  test('readOne returns null for missing id', async () => {
    const store = makeStore()
    const result = await store.readOne('missing')
    store.destroy()

    expect(result).toBeNull()
  })

  test('readSome returns only matched ids', async () => {
    const store = makeStore()
    await store.upsertSome({
      'p': r => { r.value = 'p'; r.score = 1 },
      'q': r => { r.value = 'q'; r.score = 2 },
      'r': r => { r.value = 'r'; r.score = 3 },
    })
    const some = await store.readSome(['p', 'r'])
    store.destroy()

    expect(some).toHaveLength(2)
    expect(some.map(s => s.value).sort()).toEqual(['p', 'r'])
  })

  test('readAll excludes deleted records', async () => {
    const store = makeStore()
    await store.upsertSome({
      'v1': r => { r.value = 'v1'; r.score = 1 },
      'v2': r => { r.value = 'v2'; r.score = 2 },
    })
    await store.deleteOne('v1')
    const all = await store.readAll()
    store.destroy()

    expect(all).toHaveLength(1)
    expect(all[0].value).toBe('v2')
  })
})

describe('events', () => {
  test('upserted fires on insertOne', async () => {
    const store = makeStore()
    const handler = jest.fn()
    store.on('upserted', handler)
    await store.insertOne(r => { r.value = 'event-test'; r.score = 0 })
    store.destroy()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0][0].value).toBe('event-test')
  })

  test('upserted fires on upsertOne', async () => {
    const store = makeStore()
    const handler = jest.fn()
    store.on('upserted', handler)
    await store.upsertOne('evt-1', r => { r.value = 'v'; r.score = 1 })
    store.destroy()

    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('deleted fires on deleteOne', async () => {
    const store = makeStore()
    await store.upsertOne('del-evt', r => { r.value = 'bye'; r.score = 0 })
    const handler = jest.fn()
    store.on('deleted', handler)
    await store.deleteOne('del-evt')
    store.destroy()

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0]).toContain('del-evt')
  })

  test('off unsubscribes handler', async () => {
    const store = makeStore()
    const handler = jest.fn()
    const unsub = store.on('upserted', handler)
    unsub()
    await store.upsertOne('no-event', r => { r.value = 'quiet'; r.score = 0 })
    store.destroy()

    expect(handler).not.toHaveBeenCalled()
  })
})

describe('pull token', () => {
  test('second pull sends token from first pull as previousFetchToken', async () => {
    const syncToken = 1700000001234
    const pullMock = jest.fn().mockResolvedValue({
      ok: true,
      entries: [],
      token: syncToken,
      previousToken: null,
      intendedUserId: 1,
    })
    const store = makeStore({ pull: pullMock })

    await store.pull('first')
    await store.pull('second')
    store.destroy()

    const secondCallArgs = pullMock.mock.calls[1]
    const previousFetchToken = secondCallArgs[secondCallArgs.length - 1]
    expect(previousFetchToken).toBe(syncToken)
  })

  test('first pull sends null previousFetchToken', async () => {
    const pullMock = jest.fn().mockResolvedValue({
      ok: true,
      entries: [],
      token: Date.now(),
      previousToken: null,
      intendedUserId: 1,
    })
    const store = makeStore({ pull: pullMock })

    await store.pull('first')
    store.destroy()

    const firstCallArgs = pullMock.mock.calls[0]
    const previousFetchToken = firstCallArgs[firstCallArgs.length - 1]
    expect(previousFetchToken).toBeNull()
  })
})

describe('push coalescing', () => {
  test('concurrent pushes for same record resolve to same response', async () => {
    const pushMock = jest.fn().mockResolvedValue({ ok: true, results: [] })
    const store = makeStore({ push: pushMock })
    await store.upsertOne('coalesce-me', r => { r.value = 'v'; r.score = 0 })

    const p1 = store.pushRecordIdsImpatiently(['coalesce-me'])
    const p2 = store.pushRecordIdsImpatiently(['coalesce-me'])
    const [r1, r2] = await Promise.all([p1, p2])
    store.destroy()

    expect(r1).toBe(r2)
  })
})

describe('importUpsert / importDeletion', () => {
  test('importUpsert creates records from raw data', async () => {
    const store = makeStore()
    const now = Date.now()

    await store.importUpsert([
      { id: 'import-1', value: 'imported', score: 99, server_record_id: 0, created_at: now, updated_at: now, _status: 'synced', _changed: '' } as unknown as TestModel['_raw'],
    ])

    const record = await store.readOne('import-1')
    store.destroy()

    expect(record).not.toBeNull()
    expect(record!.value).toBe('imported')
  })

  test('importDeletion removes records', async () => {
    const store = makeStore()
    await store.upsertOne('to-delete', r => { r.value = 'x'; r.score = 0 })
    await store.importDeletion(['to-delete'])
    const record = await store.readOne('to-delete')
    store.destroy()

    expect(record).toBeNull()
  })
})
