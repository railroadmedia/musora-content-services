import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import { SyncTelemetry, SeverityLevel } from '../../../../src/services/sync/telemetry/index'
import SyncContext from '../../../../src/services/sync/context/index'
import {
  BaseSessionProvider,
  BaseConnectivityProvider,
  BaseVisibilityProvider,
  NullTabsProvider,
  BaseDurabilityProvider,
} from '../../../../src/services/sync/context/providers/index'
import SyncRetry from '../../../../src/services/sync/retry'
import SyncRunScope from '../../../../src/services/sync/run-scope'
import SyncStore, { type SyncStoreConfig } from '../../../../src/services/sync/store/index'
import schema from '../../../../src/services/sync/schema/index'
import * as modelClasses from '../../../../src/services/sync/models/index'
import type BaseModel from '../../../../src/services/sync/models/Base'
import type { ModelClass, SyncUserScope } from '../../../../src/services/sync/index'
import type { SyncPullResponse, SyncPushResponse } from '../../../../src/services/sync/fetch'

// --- Sentry / Telemetry ---

function makeDummySentry() {
  return {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    addBreadcrumb: jest.fn(),
    startSpan: jest.fn((options: any, callback: any) => {
      const mockSpan = {
        _spanId: 'mock-span-id-0000',
        _parentSpanId: undefined as string | undefined,
        end: jest.fn(),
        setStatus: jest.fn(),
        setData: jest.fn(),
        setAttribute: jest.fn(),
      }
      return callback ? callback(mockSpan) : mockSpan
    }),
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      fmt: jest.fn(),
    },
  }
}

export function makeTelemetry(userScope: SyncUserScope) {
  return new SyncTelemetry(userScope, {
    Sentry: makeDummySentry(),
    level: SeverityLevel.FATAL, // silence output in tests
    pretty: false,
  })
}

// --- Context providers ---

class TestSessionProvider extends BaseSessionProvider {
  getClientId() { return 'test-client-id' }
}

class TestConnectivityProvider extends BaseConnectivityProvider {
  private online = true
  getValue() { return this.online }
  setOnline(v: boolean) { this.online = v; this['notifyListeners']() }
}

class TestVisibilityProvider extends BaseVisibilityProvider {
  getValue() { return true }
}

class TestDurabilityProvider extends BaseDurabilityProvider {
  getValue() { return true }
  failed() {}
}

export function makeContext() {
  return new SyncContext({
    session: new TestSessionProvider(),
    connectivity: new TestConnectivityProvider(),
    visibility: new TestVisibilityProvider(),
    tabs: new NullTabsProvider(),
    durability: new TestDurabilityProvider(),
  })
}

export const TEST_USER_ID = 1

export function makeUserScope(): SyncUserScope {
  return {
    initialId: TEST_USER_ID,
    getCurrentId: () => TEST_USER_ID,
  }
}

// --- Database ---

export function makeDatabase(opts: { useIncrementalIndexedDB?: boolean } = {}) {
  const adapter = new LokiJSAdapter({
    schema,
    useWebWorker: false,
    useIncrementalIndexedDB: opts.useIncrementalIndexedDB ?? false,
    dbName: `test_${Date.now()}_${Math.random()}`,
    extraLokiOptions: { autosave: false },
  })

  return new Database({
    adapter,
    modelClasses: Object.values(modelClasses),
  })
}

// --- Pull / Push mocks ---

export function makePullMock(overrides: Partial<Extract<SyncPullResponse, { ok: true }>> = {}) {
  return jest.fn().mockResolvedValue({
    ok: true,
    entries: [],
    token: Date.now(),
    intendedUserId: TEST_USER_ID,
    previousToken: null,
    ...overrides,
  } as Extract<SyncPullResponse, { ok: true }>)
}

export function makePushMock(overrides: Partial<Extract<SyncPushResponse, { ok: true }>> = {}) {
  return jest.fn().mockResolvedValue({
    ok: true,
    results: [],
    ...overrides,
  } as Extract<SyncPushResponse, { ok: true }>)
}

// --- SyncStore ---

export function makeStore<TModel extends BaseModel>(
  model: ModelClass<TModel>,
  db: Database,
  config: Partial<SyncStoreConfig<TModel>> = {}
) {
  const userScope = makeUserScope()
  const context = makeContext()
  const telemetry = makeTelemetry(userScope)
  const retry = new SyncRetry(context, telemetry)
  const runScope = new SyncRunScope()

  const store = new SyncStore<TModel>(
    {
      model,
      pull: makePullMock(),
      push: makePushMock(),
      ...config,
    },
    userScope,
    context,
    db,
    retry,
    runScope,
    telemetry
  )

  return { store, userScope, context, telemetry, retry, runScope }
}

export async function resetDatabase(db: Database) {
  await db.write(async () => {
    await db.unsafeResetDatabase()
  })
}
