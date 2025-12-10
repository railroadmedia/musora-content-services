import BaseModel from './models/Base'
import { Database } from '@nozbe/watermelondb'
import SyncRunScope from './run-scope'
import { SyncStrategy } from './strategies'
import { default as SyncStore, SyncStoreConfig } from './store'

import { ModelClass } from './index'
import SyncRetry from './retry'
import SyncContext from './context'
import { SyncError } from './errors'
import { SyncConcurrencySafetyMechanism } from './concurrency-safety'
import { SyncTelemetry } from './telemetry/index'
import createStoresFromConfig from './store-configs'
import { contentProgressObserver } from '../awards/internal/content-progress-observer'

import { onProgressSaved, onContentCompleted } from '../progress-events'
import { onContentCompletedLearningPathListener } from '../content-org/learning-paths'

export default class SyncManager {
  private static counter = 0
  private static instance: SyncManager | null = null

  public static assignAndSetupInstance(instance: SyncManager) {
    if (SyncManager.instance) {
      throw new SyncError('SyncManager already initialized')
    }
    SyncManager.instance = instance
    const teardown = instance.setup()
    return async (purge?: boolean) => {
      SyncManager.instance = null
      await teardown(purge)
    }
  }

  public static getInstanceOrNull() {
    return SyncManager.instance
  }

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      throw new SyncError('SyncManager not initialized')
    }
    return SyncManager.instance
  }

  private id: string
  public telemetry: SyncTelemetry
  private database: Database
  private context: SyncContext
  private storesRegistry: Record<string, SyncStore<any>>
  private runScope: SyncRunScope
  private retry: SyncRetry
  private strategyMap: { stores: SyncStore<any>[]; strategies: SyncStrategy[] }[]
  private safetyMap: { stores: SyncStore<any>[]; mechanisms: (() => void)[] }[]

  constructor(context: SyncContext, initDatabase: () => Database, purgeDatabase: (error: Error) => void) {
    this.id = (SyncManager.counter++).toString()

    this.telemetry = SyncTelemetry.getInstance()!
    this.context = context

    this.initDatabase = initDatabase
    this.purgeDatabase = purgeDatabase

    this.storesRegistry = this.registerStores(createStoresFromConfig(this.createStore.bind(this)))

    this.runScope = new SyncRunScope()
    this.retry = new SyncRetry(this.context, this.telemetry)

    this.strategyMap = []
    this.safetyMap = []
  }

  /**
   * Useful as a cache key (if user logs in and out multiple times, creating multiple managers)
   */
  getId() {
    return this.id
  }

  createStore<TModel extends BaseModel>(config: SyncStoreConfig<TModel>) {
    return config
  }

  realCreateStore<TModel extends BaseModel>(config: SyncStoreConfig<TModel>) {
    return new SyncStore<TModel>(
      config,
      this.context,
      this.database,
      this.retry,
      this.runScope,
      this.telemetry
    )
  }

  registerStores<TModel extends BaseModel>(stores: SyncStore<TModel>[]) {
    return Object.fromEntries(
      stores.map((store) => {
        return [store.model.table, store]
      })
    ) as Record<string, SyncStore<TModel>>
  }

  storesForModels(models: ModelClass[]) {
    return models.map((model) => this.storesRegistry[model.table])
  }

  createStrategy<T extends SyncStrategy, U extends any[]>(
    strategyClass: new (context: SyncContext, ...args: U) => T,
    ...args: U
  ): T {
    return new strategyClass(this.context, ...args)
  }

  syncStoresWithStrategies(stores: SyncStore<any>[], strategies: SyncStrategy[]) {
    this.strategyMap.push({ stores, strategies })
  }

  protectStores(stores: SyncStore<any>[], mechanisms: SyncConcurrencySafetyMechanism[]) {
    this.safetyMap.push({ stores, mechanisms })
  }

  setup() {
    this.telemetry.debug('[SyncManager] Setting up')

    this.database = this.telemetry.trace({ name: 'db:init' }, this.initDatabase)

    this.realStoresRegistry = {}
    Object.entries(this.storesRegistry).forEach(([table, storeConfig]) => {
      this.realStoresRegistry[table] = this.realCreateStore(storeConfig)
    })

    this.context.start()
    this.retry.start()

    this.strategyMap.forEach(({ stores, strategies }) => {
      strategies.forEach((strategy) => {
        stores.forEach((store) => {
          const realStore = this.realStoresRegistry[store.model.table]
          strategy.onTrigger(realStore, (reason) => {
            realStore.requestSync(reason)
          })
        })
        strategy.start()
      })
    })

    const safetyTeardowns = this.safetyMap.flatMap(({ stores, mechanisms }) => {
      return mechanisms.map((mechanism) => mechanism(this.context, stores.map(store => this.realStoresRegistry[store.model.table])))
    });

    contentProgressObserver.start(this.database).catch((error) => {
      this.telemetry.error('[SyncManager] Failed to start contentProgressObserver', error)
    })
    onContentCompleted(onContentCompletedLearningPathListener)

    const teardown = async (purge = false) => {
      this.telemetry.debug('[SyncManager] Tearing down')
      this.runScope.abort()
      this.strategyMap.forEach(({ strategies }) =>
        strategies.forEach((strategy) => strategy.stop())
      )
      safetyTeardowns.forEach((teardown) => teardown())
      contentProgressObserver.stop()
      this.retry.stop()
      this.context.stop()

      if (purge) {
        await this.purgeDatabase('TODO-db-name')
      } else {
        await this.database.write(() => this.database.unsafeResetDatabase())
      }
    }
    return teardown
  }

  getStore<TModel extends BaseModel>(model: ModelClass<TModel>) {
    const store = this.realStoresRegistry[model.table]
    if (!store) {
      throw new SyncError(`Store not found`, { table: model.table })
    }
    return store as unknown as SyncStore<TModel>
  }

  getTelemetry() {
    return this.telemetry
  }

  getContext() {
    return this.context
  }
}
