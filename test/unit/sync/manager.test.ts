import SyncManager from '@/services/sync/manager'
import { SyncTelemetry } from '@/services/sync/telemetry/index'
import { SyncError } from '@/services/sync/errors/index'
import BaseModel from '@/services/sync/models/Base'
import createStoreConfigs from '@/services/sync/store-configs'
import { makeTelemetry, makeContext, makeUserScope, makeDatabase } from './helpers/index'
import type { ModelClass, SyncUserScope } from '@/services/sync/index'

class DummyModelA extends BaseModel { static table = 'dummy_a' }
class DummyModelB extends BaseModel { static table = 'dummy_b' }
class UnknownModel extends BaseModel { static table = 'not_a_real_table' }

jest.mock('../../../src/services/awards/internal/content-progress-observer', () => ({
  contentProgressObserver: {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
  },
}))

// ---

function makeMockStrategy() {
  return {
    start: jest.fn(),
    stop: jest.fn(),
    onTrigger: jest.fn().mockReturnThis(),
  }
}

function makeMockEffect() {
  const teardown = jest.fn()
  const effect = jest.fn().mockReturnValue(teardown)
  return { effect, teardown }
}

function buildManager(opts: {
  userScope?: SyncUserScope
  destroy?: jest.Mock
  abort?: jest.Mock
} = {}) {
  const userScope = opts.userScope ?? makeUserScope()
  const context = makeContext()
  const teardownDatabase = {
    ...(opts.destroy && { destroy: opts.destroy }),
    ...(opts.abort && { abort: opts.abort }),
  }

  return new SyncManager(userScope, context, () => makeDatabase(), teardownDatabase)
}

function assignManager(manager: SyncManager) {
  return SyncManager.assignAndSetupInstance(manager)
}

function setupManager(opts: Parameters<typeof buildManager>[0] = {}) {
  const manager = buildManager(opts)
  const teardown = assignManager(manager)
  return { manager, teardown }
}

// ---

beforeEach(() => {
  SyncTelemetry.setInstance(makeTelemetry(makeUserScope()))
})

afterEach(() => {
  SyncTelemetry.clearInstance()
  ;(SyncManager as any).instance = null
})

// ---

describe('singleton lifecycle', () => {
  test('getInstance throws before any setup', () => {
    expect(() => SyncManager.getInstance()).toThrow(SyncError)
  })

  test('getInstanceOrNull returns null before any setup', () => {
    expect(SyncManager.getInstanceOrNull()).toBeNull()
  })

  test('getInstance returns manager after setup', async () => {
    const { manager, teardown } = setupManager()
    expect(SyncManager.getInstance()).toBe(manager)
    await teardown()
  })

  test('getInstanceOrNull returns manager after setup', async () => {
    const { manager, teardown } = setupManager()
    expect(SyncManager.getInstanceOrNull()).toBe(manager)
    await teardown()
  })

  test('assignAndSetupInstance throws if called while instance exists', async () => {
    const { teardown } = setupManager()
    expect(() => assignManager(buildManager())).toThrow(SyncError)
    await teardown()
  })

  test('getInstance throws after teardown', async () => {
    const { teardown } = setupManager()
    await teardown()
    expect(() => SyncManager.getInstance()).toThrow(SyncError)
  })

  test('getInstanceOrNull returns null after teardown', async () => {
    const { teardown } = setupManager()
    await teardown()
    expect(SyncManager.getInstanceOrNull()).toBeNull()
  })

  test('new instance can be set up after teardown', async () => {
    const { teardown: t1 } = setupManager()
    await t1()

    const { manager: m2, teardown: t2 } = setupManager()
    expect(SyncManager.getInstance()).toBe(m2)
    await t2()
  })
})

// ---

describe('store registry', () => {
  test('all configured model tables have stores', async () => {
    const { manager, teardown } = setupManager()
    const configuredTables = createStoreConfigs().map(c => c.model.table)
    const registeredTables = Object.keys(manager.getAllStores())

    expect(registeredTables.sort()).toEqual(configuredTables.sort())
    await teardown()
  })

  test('getStore returns store for a registered model', async () => {
    const { manager, teardown } = setupManager()
    const anyConfiguredModel = createStoreConfigs()[0].model as unknown as ModelClass
    expect(manager.getStore(anyConfiguredModel)).toBeDefined()
    await teardown()
  })

  test('getStore throws SyncError for unregistered model', async () => {
    const { manager, teardown } = setupManager()
    expect(() => manager.getStore(UnknownModel)).toThrow(SyncError)
    await teardown()
  })
})

// ---

describe('getId', () => {
  test('successive instances get different ids', async () => {
    const { manager: m1, teardown: t1 } = setupManager()
    const id1 = m1.getId()
    await t1()

    const { manager: m2, teardown: t2 } = setupManager()
    const id2 = m2.getId()
    await t2()

    expect(id1).not.toBe(id2)
  })
})

// ---

describe('strategy registration', () => {
  test('strategy.start called during setup', async () => {
    const manager = buildManager()
    const strategy = makeMockStrategy()
    manager.registerStrategies([DummyModelA], [strategy])
    const teardown = assignManager(manager)

    expect(strategy.start).toHaveBeenCalledTimes(1)
    await teardown()
  })

  test('strategy.stop called during teardown', async () => {
    const manager = buildManager()
    const strategy = makeMockStrategy()
    manager.registerStrategies([DummyModelA], [strategy])
    const teardown = assignManager(manager)
    await teardown()

    expect(strategy.stop).toHaveBeenCalledTimes(1)
  })

  test('onTrigger called once per registered model', async () => {
    const manager = buildManager()
    const strategy = makeMockStrategy()
    manager.registerStrategies([DummyModelA, DummyModelB], [strategy])
    const teardown = assignManager(manager)

    expect(strategy.onTrigger).toHaveBeenCalledTimes(2)
    await teardown()
  })

  test('multiple strategies all started and stopped', async () => {
    const manager = buildManager()
    const s1 = makeMockStrategy()
    const s2 = makeMockStrategy()
    manager.registerStrategies([DummyModelA], [s1, s2])
    const teardown = assignManager(manager)
    await teardown()

    expect(s1.start).toHaveBeenCalledTimes(1)
    expect(s2.start).toHaveBeenCalledTimes(1)
    expect(s1.stop).toHaveBeenCalledTimes(1)
    expect(s2.stop).toHaveBeenCalledTimes(1)
  })
})

// ---

describe('effect registration', () => {
  test('effect called with context and stores during setup', async () => {
    const manager = buildManager()
    const { effect, teardown: effectTeardown } = makeMockEffect()
    manager.registerEffects([DummyModelA], [effect])
    const teardown = assignManager(manager)

    expect(effect).toHaveBeenCalledTimes(1)
    expect(effect).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Array)
    )

    await teardown()
  })

  test('effect receives one store per registered model', async () => {
    const manager = buildManager()
    const { effect } = makeMockEffect()
    manager.registerEffects([DummyModelA, DummyModelB], [effect])
    const teardown = assignManager(manager)

    const [, stores] = effect.mock.calls[0]
    expect(stores).toHaveLength(2)

    await teardown()
  })

  test('effect teardown called during manager teardown', async () => {
    const manager = buildManager()
    const { effect, teardown: effectTeardown } = makeMockEffect()
    manager.registerEffects([DummyModelA], [effect])
    const teardown = assignManager(manager)
    await teardown()

    expect(effectTeardown).toHaveBeenCalledTimes(1)
  })
})

// ---

describe('teardown modes', () => {
  test('reset mode resolves', async () => {
    const { teardown } = setupManager()
    await expect(teardown('reset')).resolves.toBeUndefined()
  })

  test('default mode (no arg) resolves', async () => {
    const { teardown } = setupManager()
    await expect(teardown()).resolves.toBeUndefined()
  })

  test('destroyOrReset calls destroy with dbName and adapter', async () => {
    const destroy = jest.fn().mockResolvedValue(undefined)
    const { teardown } = setupManager({ destroy })
    await expect(teardown('destroyOrReset')).resolves.toBeUndefined()
    expect(destroy).toHaveBeenCalledTimes(1)
    expect(destroy).toHaveBeenCalledWith(expect.any(String), expect.anything())
  })

  test('abortWrites rejects when no implementation provided', async () => {
    const { teardown } = setupManager()
    await expect(teardown('abortWrites')).rejects.toThrow(
      'Cannot abort writes to database - implementation not provided'
    )
  })

  test('abortWrites calls abort with underlying adapter', async () => {
    const abort = jest.fn().mockResolvedValue(undefined)
    const { teardown } = setupManager({ abort })
    await expect(teardown('abortWrites')).resolves.toBeUndefined()
    expect(abort).toHaveBeenCalledTimes(1)
  })

  test('concurrent teardown calls both resolve', async () => {
    const { teardown } = setupManager()
    await expect(Promise.all([teardown(), teardown()])).resolves.toBeDefined()
  })
})

// ---

describe('abort', () => {
  test('does not throw', async () => {
    const { manager, teardown } = setupManager()
    expect(() => manager.abort('test reason')).not.toThrow()
    await teardown()
  })
})
