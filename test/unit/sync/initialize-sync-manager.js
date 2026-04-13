import { SyncManager, SyncContext } from '../../../src/services/sync/index.ts'
import { InitialStrategy } from '../../../src/services/sync/strategies/index.ts'
import { SyncTelemetry, SeverityLevel, SentryLike } from '../../../src/services/sync/telemetry/index.ts'
import {
  ContentLike,
  ContentProgress,
  Practice,
  PracticeDayNote,
} from '../../../src/services/sync/models/index.ts'
import syncDatabaseFactory from '../../../src/services/sync/database/factory.ts'

import syncAdapter from './adapter.ts'

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

  const resolvedUserId = userId ?? 'test-user'
  const userScope = { initialId: resolvedUserId, getCurrentId: () => resolvedUserId }
  SyncTelemetry.setInstance(new SyncTelemetry(userScope, { Sentry: dummySentry, level: SeverityLevel.WARNING, pretty: false }))

  const adapter = syncAdapter()
  const db = syncDatabaseFactory(adapter)

  const context = new SyncContext({
    session: {
      getClientId: () => 'test-client-id',
      getSessionId: () => null,
      toJSON: () => ({ 'session.client': 'test-client-id' }),
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
  const manager = new SyncManager(userScope, context, db)

  const initialStrategy = manager.createStrategy(InitialStrategy)

  manager.registerStrategies(
    [ContentLike, ContentProgress, Practice, PracticeDayNote],
    [initialStrategy]
  )

  SyncManager.assignAndSetupInstance(manager)
}
