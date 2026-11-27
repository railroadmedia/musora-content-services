jest.mock('../../../src/services/sync/introspection/diagnostics-fetch', () => ({
  diagnosticsFetch: jest.fn(),
  postDiagnostics: jest.fn().mockResolvedValue(true),
}))

import setupIntrospection, {
  clearConfigCache,
  type IntrospectionConfig,
} from '../../../src/services/sync/introspection'
import { diagnosticsFetch } from '../../../src/services/sync/introspection/diagnostics-fetch'
import * as models from '../../../src/services/sync/models'
import { makeContext, makeDatabase } from './helpers/index'

const ONE_HOUR_MS = 60 * 60 * 1000

const OFF = {
  dump_mode: 'off',
  dump_interval_minutes: null,
  event_mode: 'off',
  cursor_enabled: false,
} as const
const EVENTS_ON = { ...OFF, event_mode: 'debounced_write' } as const

const mockedFetch = diagnosticsFetch as jest.MockedFunction<typeof diagnosticsFetch>

function respondWith(config: IntrospectionConfig) {
  mockedFetch.mockResolvedValue({ ok: true, json: async () => config } as Response)
}

function settingsFetchCount() {
  return mockedFetch.mock.calls.filter(([path]) => path === '/settings').length
}

function makeLikesStore() {
  const unsubscribe = jest.fn()
  return { store: { on: jest.fn(() => unsubscribe), getLastFetchToken: jest.fn() }, unsubscribe }
}

async function flushPromises() {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

function becomeVisible(context: ReturnType<typeof makeContext>) {
  ;(context.visibility as any).notifyListeners()
}

describe('introspection config refresh', () => {
  const likesTable = (models as any).ContentLike.table as string

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-11-25T12:00:00Z') })
    mockedFetch.mockReset()
    clearConfigCache()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('teardown clears the cached config so the next setup fetches it again', async () => {
    respondWith({ ContentLike: OFF })
    const context = makeContext()
    const database = makeDatabase()

    const teardown = setupIntrospection(context, database, {})
    await flushPromises()
    await teardown()

    setupIntrospection(context, database, {})
    await flushPromises()

    expect(settingsFetchCount()).toBe(2)
  })

  test('does not refetch the config when the app becomes visible within an hour', async () => {
    respondWith({ ContentLike: OFF })
    const context = makeContext()

    setupIntrospection(context, makeDatabase(), {})
    await flushPromises()

    jest.setSystemTime(Date.now() + ONE_HOUR_MS - 1)
    becomeVisible(context)
    await flushPromises()

    expect(settingsFetchCount()).toBe(1)
  })

  test('refetches a stale config on becoming visible and keeps subscriptions when it is unchanged', async () => {
    respondWith({ ContentLike: EVENTS_ON })
    const context = makeContext()
    const { store, unsubscribe } = makeLikesStore()

    setupIntrospection(context, makeDatabase(), { [likesTable]: store as any })
    await flushPromises()
    expect(store.on).toHaveBeenCalledTimes(3)

    jest.setSystemTime(Date.now() + ONE_HOUR_MS)
    becomeVisible(context)
    await flushPromises()

    expect(settingsFetchCount()).toBe(2)
    expect(unsubscribe).not.toHaveBeenCalled()
    expect(store.on).toHaveBeenCalledTimes(3)
  })

  test('restarts with the new config when a stale config has changed', async () => {
    respondWith({ ContentLike: OFF })
    const context = makeContext()
    const { store } = makeLikesStore()

    setupIntrospection(context, makeDatabase(), { [likesTable]: store as any })
    await flushPromises()
    expect(store.on).not.toHaveBeenCalled()

    respondWith({ ContentLike: EVENTS_ON })
    jest.setSystemTime(Date.now() + ONE_HOUR_MS)
    becomeVisible(context)
    await flushPromises()

    expect(store.on).toHaveBeenCalledTimes(3)
  })

  test('stops reporting when a stale config turns a model off', async () => {
    respondWith({ ContentLike: EVENTS_ON })
    const context = makeContext()
    const { store, unsubscribe } = makeLikesStore()

    setupIntrospection(context, makeDatabase(), { [likesTable]: store as any })
    await flushPromises()

    respondWith({ ContentLike: OFF })
    jest.setSystemTime(Date.now() + ONE_HOUR_MS)
    becomeVisible(context)
    await flushPromises()

    expect(unsubscribe).toHaveBeenCalledTimes(3)
    expect(store.on).toHaveBeenCalledTimes(3)
  })

  test('refreshes the config hourly while the app stays visible', async () => {
    respondWith({ ContentLike: OFF })
    const context = makeContext()
    const { store } = makeLikesStore()

    setupIntrospection(context, makeDatabase(), { [likesTable]: store as any })
    await flushPromises()

    respondWith({ ContentLike: EVENTS_ON })
    jest.advanceTimersByTime(ONE_HOUR_MS)
    await flushPromises()

    expect(settingsFetchCount()).toBe(2)
    expect(store.on).toHaveBeenCalledTimes(3)
  })

  test('keeps the running config when refetching a stale config fails', async () => {
    respondWith({ ContentLike: EVENTS_ON })
    const context = makeContext()
    const { store, unsubscribe } = makeLikesStore()

    setupIntrospection(context, makeDatabase(), { [likesTable]: store as any })
    await flushPromises()

    mockedFetch.mockRejectedValue(new Error('offline'))
    jest.setSystemTime(Date.now() + ONE_HOUR_MS)
    becomeVisible(context)
    await flushPromises()

    expect(unsubscribe).not.toHaveBeenCalled()
  })
})

describe('introspection failure isolation', () => {
  const likesTable = (models as any).ContentLike.table as string

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-11-25T12:00:00Z') })
    mockedFetch.mockReset()
    clearConfigCache()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('a store that fails to subscribe leaves introspection stopped, and a later config refresh retries', async () => {
    respondWith({ ContentLike: EVENTS_ON })
    const context = makeContext()
    const store = {
      on: jest.fn((): (() => void) => {
        throw new Error('subscribe failed')
      }),
      getLastFetchToken: jest.fn(),
    }

    expect(() => setupIntrospection(context, makeDatabase(), { [likesTable]: store as any })).not.toThrow()
    await flushPromises()
    expect(store.on).toHaveBeenCalledTimes(1)

    store.on.mockImplementation(() => () => {})
    jest.setSystemTime(Date.now() + ONE_HOUR_MS)
    becomeVisible(context)
    await flushPromises()

    expect(store.on).toHaveBeenCalledTimes(4)
  })

  test('setup does not throw when the config fetch fails', async () => {
    mockedFetch.mockRejectedValue(new Error('offline'))

    expect(() => setupIntrospection(makeContext(), makeDatabase(), {})).not.toThrow()
    await flushPromises()
  })
})
