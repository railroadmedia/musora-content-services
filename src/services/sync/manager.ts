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
  private storesRegistry: Map<string, SyncStore<BaseModel>>
  private runScope: SyncRunScope
  private retry: SyncRetry
  private strategyMap: { stores: SyncStore<BaseModel>[]; strategies: SyncStrategy[] }[]
  private safetyMap: { stores: SyncStore<BaseModel>[]; mechanisms: (() => void)[] }[]

  constructor(context: SyncContext, initDatabase: () => Database) {
    this.telemetry = SyncTelemetry.getInstance()!
    this.context = context

    this.database = this.telemetry.trace({ name: 'db:init' }, () => inBoundary(initDatabase))
    this.runScope = new SyncRunScope()

    this.storesRegistry = new Map()
    this.strategyMap = []
    this.safetyMap = []

    this.retry = new SyncRetry(this.context, this.telemetry)
  }

  createStore<TModel extends BaseModel>(config: SyncStoreConfig<TModel>) {
    if (this.storesRegistry[config.model.table]) {
      throw new SyncError(`Store ${config.model.table} already registered`)
    }
    const store = new SyncStore<TModel>(config, this.context, this.database, this.retry, this.runScope, this.telemetry)
    this.storesRegistry[config.model.table] = store
    return store
  }

  createStrategy<T extends SyncStrategy, U extends any[]>(
    strategyClass: new (context: SyncContext, ...args: U) => T,
    ...args: U
  ): T {
    return new strategyClass(this.context, ...args)
  }

  syncStoresWithStrategies(stores: SyncStore[], strategies: SyncStrategy[]) {
    this.strategyMap.push({ stores, strategies })
  }

  protectStores(
    stores: SyncStore[],
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

  getStore<TModel extends BaseModel>(model: ModelClass<TModel>): SyncStore<TModel> {
    const store = this.storesRegistry[model.table]
    if (!store) {
      throw new SyncError(`Store not found`, { table: model.table })
    }
    return store
  }

  getTelemetry() {
    return this.telemetry
  }

  getContext() {
    return this.context
  }
}
