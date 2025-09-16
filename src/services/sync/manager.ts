import BaseModel from './models/Base'
import { Database } from '@nozbe/watermelondb'
import SyncRunScope from './run-scope'
import { SyncStrategy } from './strategies'
import { default as SyncStore, SyncStoreConfig } from './store'

import SyncBackoff from './backoff'
import SyncContext from './context'
import type SyncConcurrencySafety from './concurrency-safety'
import telemetry from './telemetry'

export default class SyncManager {
  private static instance: SyncManager | null = null

  public static assignAndSetupInstance(instance: SyncManager) {
    if (SyncManager.instance) {
      throw new Error('SyncManager already initialized')
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
      throw new Error('SyncManager not initialized')
    }
    return SyncManager.instance
  }

  private database: Database
  private context: SyncContext
  private storesRegistry: Record<typeof BaseModel.table, SyncStore<BaseModel>>
  private runScope: SyncRunScope
  private backoff: SyncBackoff

  private strategyMap: { stores: SyncStore<BaseModel>[]; strategies: SyncStrategy[] }[]
  private safetyMap: { stores: SyncStore<BaseModel>[]; safety: SyncConcurrencySafety }[]

  constructor(context: SyncContext, database: Database) {
    this.database = database
    this.context = context
    this.runScope = new SyncRunScope()

    this.storesRegistry = {} as Record<typeof BaseModel.table, SyncStore<BaseModel>>
    this.strategyMap = []
    this.safetyMap = []

    this.backoff = new SyncBackoff(this.context)
    this.backoff.start()
  }

  createStore(config: SyncStoreConfig) {
    if (this.storesRegistry[config.model.table]) {
      throw new Error(`Store ${config.model.table} already registered`)
    }
    const store = new SyncStore(config, this.database, this.backoff, this.runScope)
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
    safetyClass: new (context: SyncContext, stores: SyncStore[]) => SyncConcurrencySafety
  ) {
    this.safetyMap.push({ stores, safety: new safetyClass(this.context, stores) })
  }

  setup() {
    this.safetyMap.forEach(({ safety }) => safety.start())

    this.strategyMap.forEach(({ stores, strategies }) => {
      strategies.forEach(strategy => {
        stores.forEach(store => {
          strategy.onTrigger(store, reason => {
            telemetry.info(`[Manager] Sync triggered for ${store.model.table} because: ` + reason)
            store.sync()
          })
          strategy.start()
        })
      })
    })

    // teardown (ideally occurring on logout) should:
    // - stop all safety mechanisms
    // - stop all sync strategies
    // - cancel any scheduled fetch requests that came from those sync strategies (handled by abort controller)
    // - reset local databases
    // - purge any databases that are no longer referenced in schema (possible if user logs out after a schema change)?

    const teardown = async () => {
      this.runScope.abort()
      this.strategyMap.forEach(({ strategies }) => strategies.forEach(strategy => strategy.stop()))
      this.safetyMap.forEach(({ safety }) => safety.stop())
      this.backoff.stop()
      await this.database.write(() => this.database.unsafeResetDatabase())
      // todo - purge adapter?
    }
    return teardown
  }

  getStore<TModel extends typeof BaseModel>(model: TModel) {
    const store = this.storesRegistry[model.table]
    if (!store) {
      throw new Error(`Store for ${model.table} not found`)
    }
    return store as unknown as SyncStore<InstanceType<TModel>>
  }

  getContext() {
    return this.context
  }
}
