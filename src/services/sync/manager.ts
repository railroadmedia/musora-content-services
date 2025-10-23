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
import { inBoundary } from './errors/boundary'
import createStoresFromConfig from './store-configs'

export default class SyncManager {
  private static instance: SyncManager | null = null

  public static assignAndSetupInstance(instance: SyncManager) {
    if (SyncManager.instance) {
      throw new SyncError('SyncManager already initialized')
    }
    SyncManager.instance = instance
    const teardown = instance.setup()
    return async () => {
      await teardown()
      SyncManager.instance = null
    }
  }

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      throw new SyncError('SyncManager not initialized')
    }
    return SyncManager.instance
  }

  public telemetry: SyncTelemetry
  private database: Database
  private context: SyncContext
  private storesRegistry: Record<string, SyncStore<any>>
  private runScope: SyncRunScope
  private retry: SyncRetry
  private strategyMap: { stores: SyncStore<any>[]; strategies: SyncStrategy[] }[]
  private safetyMap: { stores: SyncStore<any>[]; mechanisms: (() => void)[] }[]

  constructor(context: SyncContext, initDatabase: () => Database) {
    this.telemetry = SyncTelemetry.getInstance()!
    this.context = context

    this.database = this.telemetry.trace({ name: 'db:init' }, () => inBoundary(initDatabase))

    this.runScope = new SyncRunScope()
    this.retry = new SyncRetry(this.context, this.telemetry)

    this.storesRegistry = this.registerStores(createStoresFromConfig(this.createStore.bind(this)))

    this.strategyMap = []
    this.safetyMap = []
  }

  createStore<TModel extends BaseModel>(config: SyncStoreConfig<TModel>) {
    return new SyncStore<TModel>(config, this.context, this.database, this.retry, this.runScope, this.telemetry)
  }

  registerStores<TModel extends BaseModel>(stores: SyncStore<TModel>[]) {
    return Object.fromEntries(stores.map(store => {
      return [store.model.table, store]
    })) as Record<string, SyncStore<TModel>>
  }

  storesForModels(models: ModelClass[]) {
    return models.map(model => this.storesRegistry[model.table])
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

  protectStores(
    stores: SyncStore<any>[],
    mechanisms: SyncConcurrencySafetyMechanism[]
  ) {
    const teardowns = mechanisms.map(mechanism => mechanism(this.context, stores))
    this.safetyMap.push({ stores, mechanisms: teardowns })
  }

  setup() {
    this.telemetry.debug('[SyncManager] Setting up')

    this.context.start()
    this.retry.start()

    this.strategyMap.forEach(({ stores, strategies }) => {
      strategies.forEach(strategy => {
        stores.forEach(store => {
          strategy.onTrigger(store, reason => {
            store.sync(reason)
          })
        })
        strategy.start()
      })
    })

    const teardown = async () => {
      this.telemetry.debug('[SyncManager] Tearing down')
      this.runScope.abort()
      this.strategyMap.forEach(({ strategies }) => strategies.forEach(strategy => strategy.stop()))
      this.safetyMap.forEach(({ mechanisms }) => mechanisms.forEach(mechanism => mechanism()))
      this.retry.stop()
      this.context.stop()
      await this.database.write(() => this.database.unsafeResetDatabase())
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
