import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import SyncManager from './manager'
import SyncContext from './context'
import syncAdapterFactory from './adapters/factory'
import {
  BaseSessionProvider,
  BaseConnectivityProvider,
  BaseVisibilityProvider,
  NullTabsProvider,
  BaseDurabilityProvider
} from './context/providers'
import { ContentProgress, ContentLike, ContentPractice, UserAwardProgress } from './models'
import { InitialStrategy, PollingStrategy } from './strategies'

class WebSessionProvider extends BaseSessionProvider {
  isActive(): boolean {
    return true
  }
}

class WebConnectivityProvider extends BaseConnectivityProvider {
  isOnline(): boolean {
    return navigator.onLine
  }

  start() {
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
  }

  stop() {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
  }

  private handleOnline = () => {
    this.emit('online')
  }

  private handleOffline = () => {
    this.emit('offline')
  }
}

class WebVisibilityProvider extends BaseVisibilityProvider {
  isVisible(): boolean {
    return document.visibilityState === 'visible'
  }

  start() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  }

  stop() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.emit('visible')
    } else {
      this.emit('hidden')
    }
  }
}

class WebDurabilityProvider extends BaseDurabilityProvider {
  async persist(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist()
    }
    return false
  }

  async persisted(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persisted) {
      return await navigator.storage.persisted()
    }
    return false
  }
}

export function initializeSyncForWeb(namespace: string = 'musora'): () => Promise<void> {
  const context = new SyncContext({
    session: new WebSessionProvider(),
    connectivity: new WebConnectivityProvider(),
    visibility: new WebVisibilityProvider(),
    tabs: new NullTabsProvider(),
    durability: new WebDurabilityProvider()
  })

  const createAdapter = syncAdapterFactory(
    LokiJSAdapter,
    namespace,
    {
      useWebWorker: false,
      useIncrementalIndexedDB: true
    }
  )

  const initDatabase = (): Database => {
    const adapter = createAdapter()
    return new Database({
      adapter,
      modelClasses: [ContentProgress, ContentLike, ContentPractice, UserAwardProgress]
    })
  }

  const manager = new SyncManager(context, initDatabase)

  manager.syncStoresWithStrategies(
    manager.storesForModels([ContentProgress, ContentLike, ContentPractice, UserAwardProgress]),
    [
      manager.createStrategy(InitialStrategy),
      manager.createStrategy(PollingStrategy, 5 * 60 * 1000)
    ]
  )

  return SyncManager.assignAndSetupInstance(manager)
}
