import BaseModel from './models/Base'
import { Database } from '@nozbe/watermelondb'
import SyncRunScope from './run-scope'
import { SyncStrategy } from './strategies'
import { default as SyncStore, SyncStoreConfig } from './store'

import SyncRetry from './retry'
import SyncContext from './context'
import telemetry from './telemetry'
import { SyncError } from './errors'
import { SyncConcurrencySafetyMechanism } from '@/infrastructure/sync/concurrency-safety'

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

  private database: Database
  private context: SyncContext
  private storesRegistry: Record<typeof BaseModel.table, SyncStore<BaseModel>>
  private runScope: SyncRunScope
  private retry: SyncRetry
  private strategyMap: { stores: SyncStore<BaseModel>[]; strategies: SyncStrategy[] }[]
  private safetyMap: { stores: SyncStore<BaseModel>[]; mechanisms: (() => void)[] }[]

  constructor(context: SyncContext, database: Database) {
    this.database = database
    this.context = context
    this.runScope = new SyncRunScope()

    this.storesRegistry = {} as Record<typeof BaseModel.table, SyncStore<BaseModel>>
    this.strategyMap = []
    this.safetyMap = []

    this.retry = new SyncRetry(this.context)
    this.retry.start()
  }

  createStore(config: SyncStoreConfig) {
    if (this.storesRegistry[config.model.table]) {
      throw new SyncError(`Store ${config.model.table} already registered`)
    }
    const store = new SyncStore(config, this.database, this.retry, this.runScope)
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
    telemetry.debug('[SyncManager] Setting up')
    this.context.start()

    this.strategyMap.forEach(({ stores, strategies }) => {
      strategies.forEach(strategy => {
        stores.forEach(store => {
          strategy.onTrigger(store, reason => {
            store.sync(reason)
          })
          strategy.start()
        })
      })
    })

    const teardown = async () => {
      telemetry.debug('[SyncManager] Tearing down')
      this.runScope.abort()
      this.strategyMap.forEach(({ strategies }) => strategies.forEach(strategy => strategy.stop()))
      this.safetyMap.forEach(({ mechanisms }) => mechanisms.forEach(mechanism => mechanism()))
      this.retry.stop()
      this.context.stop()
      await this.database.write(() => this.database.unsafeResetDatabase())
    }
    return teardown
  }

  getStore<TModel extends typeof BaseModel>(model: TModel) {
    const store = this.storesRegistry[model.table]
    if (!store) {
      throw new SyncError(`Store not found`, { table: model.table })
    }
    return store as unknown as SyncStore<InstanceType<TModel>>
  }

  getContext() {
    return this.context
  }
}
