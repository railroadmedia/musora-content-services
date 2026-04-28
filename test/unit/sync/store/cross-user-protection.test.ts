import { Database } from '@nozbe/watermelondb'
import { makeTelemetry, makeContext, makePullMock, makePushMock } from '../helpers/index'
import TestModel, { makeTestDatabase } from '../helpers/TestModel'
import SyncStore from '@/services/sync/store/index'
import SyncRetry from '@/services/sync/retry'
import SyncRunScope from '@/services/sync/run-scope'
import type { SyncUserScope } from '@/services/sync/index'
import { SyncError } from '@/services/sync/errors/index'

// ---

let db: Database

function makeStore(userScope: SyncUserScope, pull = makePullMock()) {
  const context = makeContext()
  const telemetry = makeTelemetry(userScope)
  const retry = new SyncRetry(context, telemetry)
  const runScope = new SyncRunScope()

  return new SyncStore<TestModel>(
    { model: TestModel, pull, push: makePushMock() },
    userScope,
    context,
    db,
    retry,
    runScope,
    telemetry
  )
}

function makeScope(overrides: Partial<SyncUserScope> = {}): SyncUserScope {
  return {
    initialId: 1,
    getCurrentId: () => 1,
    ...overrides,
  }
}

function makePullResponse(overrides: Partial<{ intendedUserId: number }> = {}) {
  return jest.fn().mockResolvedValue({
    ok: true,
    entries: [],
    token: Date.now(),
    previousToken: null,
    intendedUserId: 1,
    ...overrides,
  })
}

beforeEach(() => {
  db = makeTestDatabase()
})

afterEach(async () => {
  await db.write(async () => db.unsafeResetDatabase())
})

// ---

describe('write protection (paranoidWrite)', () => {
  describe('same user', () => {
    test('write proceeds when getCurrentId matches initialId', async () => {
      const store = makeStore(makeScope({ initialId: 1, getCurrentId: () => 1 }))
      const result = await store.insertOne(r => { r.value = 'hello' })
      store.destroy()

      expect(result.value).toBe('hello')
    })
  })

  describe('different user', () => {
    test('throws SyncError when getCurrentId returns different id', async () => {
      const store = makeStore(makeScope({ initialId: 1, getCurrentId: () => 2 }))

      await expect(store.insertOne(r => { r.value = 'hello' })).rejects.toThrow(SyncError)
      store.destroy()
    })

    test('error message indicates cross-user write', async () => {
      const store = makeStore(makeScope({ initialId: 1, getCurrentId: () => 2 }))

      await expect(store.insertOne(r => { r.value = 'hello' })).rejects.toThrow(
        'Aborted cross-user write operation'
      )
      store.destroy()
    })
  })

  describe('null getCurrentId without fetchCurrentId', () => {
    test('throws SyncError', async () => {
      const store = makeStore(makeScope({ initialId: 1, getCurrentId: () => null }))

      await expect(store.insertOne(r => { r.value = 'hello' })).rejects.toThrow(SyncError)
      store.destroy()
    })

    test('error message indicates cross-user write', async () => {
      const store = makeStore(makeScope({ initialId: 1, getCurrentId: () => null }))

      await expect(store.insertOne(r => { r.value = 'hello' })).rejects.toThrow(
        'Aborted cross-user write operation'
      )
      store.destroy()
    })
  })

  describe('fetchCurrentId fallback', () => {
    test('fetchCurrentId is called when getCurrentId returns null', async () => {
      const fetchCurrentId = jest.fn().mockResolvedValue(1)
      const store = makeStore(makeScope({ initialId: 1, getCurrentId: () => null, fetchCurrentId }))

      await store.insertOne(r => { r.value = 'hello' })
      store.destroy()

      expect(fetchCurrentId).toHaveBeenCalledTimes(1)
    })

    test('write proceeds when fetchCurrentId resolves to same id', async () => {
      const store = makeStore(makeScope({
        initialId: 1,
        getCurrentId: () => null,
        fetchCurrentId: () => Promise.resolve(1),
      }))

      const result = await store.insertOne(r => { r.value = 'resolved' })
      store.destroy()

      expect(result.value).toBe('resolved')
    })

    test('throws when fetchCurrentId resolves to different id', async () => {
      const store = makeStore(makeScope({
        initialId: 1,
        getCurrentId: () => null,
        fetchCurrentId: () => Promise.resolve(2),
      }))

      await expect(store.insertOne(r => { r.value = 'hello' })).rejects.toThrow(
        'Aborted cross-user write operation'
      )
      store.destroy()
    })

    test('throws SyncError when fetchCurrentId rejects', async () => {
      const store = makeStore(makeScope({
        initialId: 1,
        getCurrentId: () => null,
        fetchCurrentId: () => Promise.reject(new Error('network error')),
      }))

      await expect(store.insertOne(r => { r.value = 'hello' })).rejects.toBeInstanceOf(SyncError)
      store.destroy()
    })

    test('error message indicates fetchCurrentId failed', async () => {
      const store = makeStore(makeScope({
        initialId: 1,
        getCurrentId: () => null,
        fetchCurrentId: () => Promise.reject(new Error('network error')),
      }))

      await expect(store.insertOne(r => { r.value = 'hello' })).rejects.toThrow(
        'Aborted cross-user write operation after fetchCurrentId failed'
      )
      store.destroy()
    })
  })
})

// ---

describe('pull protection (intendedUserId)', () => {
  test('pull succeeds when intendedUserId matches initialId', async () => {
    const store = makeStore(makeScope({ initialId: 1 }), makePullResponse({ intendedUserId: 1 }))

    await expect(store.pull('test')).resolves.not.toThrow()
    store.destroy()
  })

  test('throws SyncError when intendedUserId does not match initialId', async () => {
    const store = makeStore(makeScope({ initialId: 1 }), makePullResponse({ intendedUserId: 2 }))

    await expect(store.pull('test')).rejects.toThrow(SyncError)
    store.destroy()
  })

  test('throws when intendedUserId does not match currentId', async () => {
    const store = makeStore(
      makeScope({ initialId: 1, getCurrentId: () => 2 }),
      makePullResponse({ intendedUserId: 1 })
    )

    await expect(store.pull('test')).rejects.toThrow(SyncError)
    store.destroy()
  })

  test('error message indicates intended user mismatch', async () => {
    const store = makeStore(makeScope({ initialId: 1 }), makePullResponse({ intendedUserId: 2 }))

    await expect(store.pull('test')).rejects.toThrow('Intended user ID does not match')
    store.destroy()
  })

  test('throws SyncError when getCurrentId is null and fetchCurrentId rejects during pull', async () => {
    const store = makeStore(
      makeScope({
        initialId: 1,
        getCurrentId: () => null,
        fetchCurrentId: () => Promise.reject(new Error('auth error')),
      }),
      makePullResponse({ intendedUserId: 1 })
    )

    await expect(store.pull('test')).rejects.toThrow(SyncError)
    store.destroy()
  })
})
