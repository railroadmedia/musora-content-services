import { SyncManager, SyncContext } from '../../src/services/sync/index'
import {
  BaseSessionProvider,
  BaseConnectivityProvider,
  BaseDurabilityProvider,
  BaseTabsProvider,
  BaseVisibilityProvider,
} from '../../src/services/sync/context/providers/'
import adapterFactory from '../../src/services/sync/adapters/factory'
import LokiJSAdapter from '../../src/services/sync/adapters/lokijs'
import EventEmitter from '../../src/services/sync/utils/event-emitter'
import { InitialStrategy, PollingStrategy } from '../../src/services/sync/strategies/index'
import { SyncTelemetry, SentryLike } from '../../src/services/sync/telemetry/index'
import {
  ContentLike,
  ContentProgress,
  Practice,
  PracticeDayNote,
} from '../../src/services/sync/models/index'
import syncDatabaseFactory from '../../src/services/sync/database/factory'

import syncAdapter, { SyncAdapterEventBus } from './adapter'

export function initializeSyncManager(userId) {
  if (SyncManager.getInstanceOrNull()) {
    return
  }
  const dummySentry = {
    captureException: () => '',
    addBreadcrumb: () => {},
    startSpan: (options, callback) => {
      // Return a mock span object with the properties Sentry expects
      const mockSpan = {
        _spanId: 'mock-span-id',
        end: () => {},
        setStatus: () => {},
        setData: () => {},
        setAttribute: () => {},
      }

      if (callback) {
        return callback(mockSpan)
      }
      return mockSpan
    },
  }

  SyncTelemetry.setInstance(new SyncTelemetry(userId, { Sentry: dummySentry, level: 'DEBUG', pretty: false }))

  const adapterBus = new SyncAdapterEventBus()
  const adapter = syncAdapter(userId, adapterBus)
  const db = syncDatabaseFactory(adapter)

  const context = new SyncContext({
    session: {
      getClientId: () => 'test-client-id',
      getSessionId: () => null,
      start: () => {},
      stop: () => {},
    },
    connectivity: {
      getValue: () => true,
      subscribe: () => () => {},
      notifyListeners: () => {},
      start: () => {},
      stop: () => {},
    },
    visibility: {
      getValue: () => true,
      subscribe: () => () => {},
      notifyListeners: () => {},
      start: () => {},
      stop: () => {},
    },
    tabs: {
      hasOtherTabs: () => false,
      broadcast: () => {},
      subscribe: () => () => {},
      start: () => {},
      stop: () => {},
    },
    durability: {
      getValue: () => true,
      start: () => {},
      stop: () => {},
    },
  })
  const manager = new SyncManager(context, db)

  const initialStrategy = manager.createStrategy(InitialStrategy)
  const aggressivePollingStrategy = manager.createStrategy(PollingStrategy, 3600_000)

  manager.syncStoresWithStrategies(
    manager.storesForModels([ContentLike, ContentProgress, Practice, PracticeDayNote]),
    [initialStrategy, aggressivePollingStrategy]
  )

  manager.protectStores(
    manager.storesForModels([ContentLike, ContentProgress, Practice, PracticeDayNote]),
    []
  )

  SyncManager.assignAndSetupInstance(manager)
}
