/**
 * @jest-environment jsdom
 *
 * Tests SyncStore with the IncrementalIndexedDB-backed LokiJS adapter.
 *
 * Scope: IDB-specific behavior only (fetch token persistence, initialization,
 * and bootstrapping — data loading from IDB into a new Database instance).
 * General CRUD/event/coalescing behavior is covered in store.test.ts, which uses
 * the plain LokiJS in-memory adapter.
 *
 * Concurrency note: loki.saveDatabase() with fakeIndexedDB's IncrementalIDBAdapter
 * produces conflicting IDB transactions when multiple writes happen in rapid sequence
 * (IncrementalIDBAdapter auto-save overlaps with ensurePersistence()'s saveDatabase()).
 * Bootstrapping tests use a single write per "session" to stay within the safe window.
 */

import { IDBFactory } from 'fake-indexeddb'
import { makeTelemetry, makeContext, makeUserScope, makePullMock, makePushMock, TEST_USER_ID } from '../helpers/index'
import TestModel, { makeTestDatabase } from '../helpers/TestModel'
import SyncStore from '../../../../src/services/sync/store/index'
import SyncRetry from '../../../../src/services/sync/retry'
import SyncRunScope from '../../../../src/services/sync/run-scope'
import type { SyncPullResponse } from '../../../../src/services/sync/fetch'

// Fresh IDB instance per test — prevents cross-test transaction leakage
beforeEach(() => {
  ;(global as any).indexedDB = new IDBFactory()
})

function makeStore(overrides: { pull?: any; push?: any; dbName?: string } = {}) {
  const db = makeTestDatabase({ useIncrementalIndexedDB: true, dbName: overrides.dbName })
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

  return { store, db }
}

// ---

describe('fetch token persistence (IDB localStorage)', () => {
  test('getLastFetchToken returns null before any pull', async () => {
    const { store } = makeStore()
    const token = await store.getLastFetchToken()
    store.destroy()

    expect(token).toBeNull()
  })

  test('getLastFetchToken is set after successful pull', async () => {
    const expectedToken = 1700000000000
    const pull = jest.fn().mockResolvedValue({
      ok: true,
      entries: [],
      token: expectedToken,
      intendedUserId: TEST_USER_ID,
      previousToken: null,
    } as Extract<SyncPullResponse, { ok: true }>)

    const { store } = makeStore({ pull })
    await store.pullRecords()
    const token = await store.getLastFetchToken()
    store.destroy()

    expect(token).toBe(expectedToken)
  })

  test('pullCompleted event fires after successful pull', async () => {
    const handler = jest.fn()
    const { store } = makeStore()
    store.on('pullCompleted', handler)

    await store.pullRecords()
    store.destroy()

    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('failed pull does not set fetch token', async () => {
    const pull = jest.fn().mockResolvedValue({ ok: false, failureType: 'fetch', isRetryable: false })

    const { store } = makeStore({ pull })
    await store.pullRecords()
    const token = await store.getLastFetchToken()
    store.destroy()

    expect(token).toBeNull()
  })
})

// ---

describe('IDB bootstrapping (prior session data loaded into new Database instance)', () => {
  const BOOTSTRAP_DB = 'test-bootstrap'

  test('records written locally are readable from a new Database instance', async () => {
    const { store: session1 } = makeStore({ dbName: BOOTSTRAP_DB })
    await session1.upsertOne('boot-rec-1', r => {
      r.value = 'persisted-value'
      r.score = 42
    })
    session1.destroy()

    const { store: session2 } = makeStore({ dbName: BOOTSTRAP_DB })
    const records = await session2.readAll()
    session2.destroy()

    expect(records).toHaveLength(1)
    expect(records[0].id).toBe('boot-rec-1')
    expect(records[0].value).toBe('persisted-value')
    expect(records[0].score).toBe(42)
  })

  test('fetch token written during pull is readable from a new Database instance', async () => {
    const TOKEN = 1700000000000
    const pull = jest.fn().mockResolvedValue({
      ok: true,
      entries: [],
      token: TOKEN,
      intendedUserId: TEST_USER_ID,
      previousToken: null,
    })

    const { store: session1 } = makeStore({ pull, dbName: BOOTSTRAP_DB })
    await session1.pullRecords()
    // pull doesn't call ensurePersistence — flush explicitly so IDB has the token
    await (session1 as any).ensurePersistence()
    session1.destroy()

    const { store: session2 } = makeStore({ dbName: BOOTSTRAP_DB })
    const token = await session2.getLastFetchToken()
    session2.destroy()

    expect(token).toBe(TOKEN)
  })

  // Two sequential upserts — if this flakes with IDB transaction conflicts,
  // collapse them into a single upsertSome call instead.
  test('multiple records survive a restart', async () => {
    const { store: session1 } = makeStore({ dbName: BOOTSTRAP_DB })
    await session1.upsertOne('boot-a', r => { r.value = 'alpha'; r.score = 1 })
    await session1.upsertOne('boot-b', r => { r.value = 'beta'; r.score = 2 })
    session1.destroy()

    const { store: session2 } = makeStore({ dbName: BOOTSTRAP_DB })
    const records = await session2.readAll()
    session2.destroy()

    expect(records).toHaveLength(2)
    const byId = Object.fromEntries(records.map(r => [r.id, r]))
    expect(byId['boot-a'].value).toBe('alpha')
    expect(byId['boot-b'].value).toBe('beta')
  })

  test('new Database instance with no prior IDB data starts empty', async () => {
    const { store } = makeStore({ dbName: BOOTSTRAP_DB })
    const records = await store.readAll()
    const token = await store.getLastFetchToken()
    store.destroy()

    expect(records).toHaveLength(0)
    expect(token).toBeNull()
  })
})
