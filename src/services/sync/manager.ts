import BaseModel from './models/Base'
import { Database } from '@nozbe/watermelondb'
import SyncRunScope from './run-scope'
import { SyncStrategy } from './strategies'
import { default as SyncStore, SyncStoreConfig } from './store'

import { ModelClass } from './index'
import SyncRetry from './retry'
import SyncContext from './context'
import { SyncError } from './errors'
import { SyncEffect } from './effects'
import { SyncTelemetry } from './telemetry/index'
import createStoresFromConfig from './store-configs'
import { contentProgressObserver } from '../awards/internal/content-progress-observer'

import { onProgressSaved, onContentCompleted } from '../progress-events'
import { onContentCompletedLearningPathListener } from '../content-org/learning-paths'
import { DatabaseAdapter } from './adapters/factory'

export default class SyncManager {
  private static counter = 0
  private static instance: SyncManager | null = null

  public static assignAndSetupInstance(instance: SyncManager) {
    if (SyncManager.instance) {
      throw new SyncError('SyncManager already initialized')
    }
    SyncManager.instance = instance
    const teardown = instance.setup()
    return async () => {
      SyncManager.instance = null
      return await teardown()
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
  private context: SyncContext
  private storeConfigsRegistry: Record<string, SyncStoreConfig<any>>
  private storesRegistry: Record<string, SyncStore<any>>
  private runScope: SyncRunScope
  private retry: SyncRetry
  private strategyMap: { stores: SyncStore<any>[]; strategies: SyncStrategy[] }[]
  private effectMap: { stores: SyncStore<any>[]; effects: SyncEffect[] }[]

  private initDatabase: () => Database
  private destroyDatabase: (dbName: string, adapter: DatabaseAdapter) => void

  constructor(context: SyncContext, initDatabase: () => Database, destroyDatabase: (dbName: string, adapter: DatabaseAdapter) => void) {
    this.id = (SyncManager.counter++).toString()

    this.telemetry = SyncTelemetry.getInstance()!
    this.context = context

    this.initDatabase = initDatabase
    this.destroyDatabase = destroyDatabase

    this.storeConfigsRegistry = this.registerStores(createStoresFromConfig())
    this.storesRegistry = {}

    this.runScope = new SyncRunScope()
    this.retry = new SyncRetry(this.context, this.telemetry)

    this.strategyMap = []
    this.effectMap = []
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

  realCreateStore(config: SyncStoreConfig, database: Database) {
    return new SyncStore(
      config,
      this.context,
      database,
      this.retry,
      this.runScope,
      this.telemetry
    )
  }

  registerStores(stores: SyncStoreConfig[]) {
    return Object.fromEntries(
      stores.map((store) => {
        return [store.model.table, store]
      })
    ) as Record<string, SyncStoreConfig>
  }

  storesForModels(models: ModelClass[]) {
    return models.map((model) => this.storeConfigsRegistry[model.table])
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

  protectStores(stores: SyncStore<any>[], effects: SyncEffect[]) {
    this.effectMap.push({ stores, effects })
  }

  setup() {
    this.telemetry.debug('[SyncManager] Setting up')

    const database = this.telemetry.trace({ name: 'db:init' }, this.initDatabase)

    Object.entries(this.storeConfigsRegistry).forEach(([table, storeConfig]) => {
      this.storesRegistry[table] = this.realCreateStore(storeConfig, database)
    })

    this.context.start()
    this.retry.start()

    this.strategyMap.forEach(({ stores, strategies }) => {
      strategies.forEach((strategy) => {
        stores.forEach((store) => {
          const realStore = this.storesRegistry[store.model.table]
          strategy.onTrigger(realStore, (reason) => {
            realStore.requestSync(reason)
          })
        })
        strategy.start()
      })
    })

    const safetyTeardowns = this.effectMap.flatMap(({ stores, effects }) => {
      return effects.map((effect) => effect(this.context, stores.map(store => this.storesRegistry[store.model.table])))
    });

    contentProgressObserver.start(database).catch((error) => {
      this.telemetry.error('[SyncManager] Failed to start contentProgressObserver', error)
    })
    onContentCompleted(onContentCompletedLearningPathListener)

    const teardown = async () => {
      this.telemetry.debug('[SyncManager] Tearing down')
      this.runScope.abort()
      this.strategyMap.forEach(({ strategies }) =>
        strategies.forEach((strategy) => strategy.stop())
      )
      safetyTeardowns.forEach((teardown) => teardown())
      contentProgressObserver.stop()
      this.retry.stop()
      this.context.stop()

      if (database.adapter.underlyingAdapter && database.adapter.dbName) {
        this.destroyDatabase(database.adapter.dbName, database.adapter.underlyingAdapter)
      }
    }
    return teardown
  }

  getStore<TModel extends BaseModel>(model: ModelClass<TModel>) {
    const store = this.storesRegistry[model.table]
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
