import BaseModel from './models/Base'
import { Database } from '@nozbe/watermelondb'
import { DatabaseAdapter } from '@nozbe/watermelondb/adapters/type'
import SyncRunScope from './run-scope'
import { SyncStrategy } from './strategies'
import { default as SyncStore, SyncStoreConfig } from './store'

import { ModelClass } from './index'
import SyncRetry from './retry'
import SyncContext from './context'
import { SyncError } from './errors'
import { SyncEffect } from './effects'
import { SyncTelemetry } from './telemetry/index'
import createStoreConfigs from './store-configs'
import { contentProgressObserver } from '../awards/internal/content-progress-observer'

export default class SyncManager {
  private static counter = 0
  private static instance: SyncManager | null = null

  public static assignAndSetupInstance(instance: SyncManager) {
    if (SyncManager.instance) {
      throw new SyncError('SyncManager already initialized')
    }

    SyncManager.instance = instance
    const teardown = instance.setup()

    return (force = false) => {
      SyncManager.instance = null
      return teardown(force).catch(error => {
        SyncManager.instance = instance // restore instance on teardown failure
        throw error
      })
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
  private strategyMap: { models: ModelClass[]; strategies: SyncStrategy[] }[]
  private effectMap: { models: ModelClass[]; effects: SyncEffect[] }[]

  private initDatabase: () => Database
  private destroyDatabase?: (dbName: string, adapter: DatabaseAdapter) => Promise<void>

  constructor(context: SyncContext, initDatabase: () => Database, destroyDatabase?: (dbName: string, adapter: DatabaseAdapter) => Promise<void>) {
    this.id = (SyncManager.counter++).toString()

    this.telemetry = SyncTelemetry.getInstance()!
    this.context = context

    this.initDatabase = initDatabase
    this.destroyDatabase = destroyDatabase

    this.storeConfigsRegistry = this.registerStoreConfigs(createStoreConfigs())
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

  createStore(config: SyncStoreConfig, database: Database) {
    return new SyncStore(
      config,
      this.context,
      database,
      this.retry,
      this.runScope,
      this.telemetry
    )
  }

  registerStoreConfigs(stores: SyncStoreConfig[]) {
    return Object.fromEntries(
      stores.map((store) => {
        return [store.model.table, store]
      })
    ) as Record<string, SyncStoreConfig>
  }

  createStrategy<T extends SyncStrategy, U extends any[]>(
    strategyClass: new (context: SyncContext, ...args: U) => T,
    ...args: U
  ): T {
    return new strategyClass(this.context, ...args)
  }

  registerStrategies(models: ModelClass[], strategies: SyncStrategy[]) {
    this.strategyMap.push({ models, strategies })
  }

  registerEffects(models: ModelClass[], effects: SyncEffect[]) {
    this.effectMap.push({ models, effects })
  }

  setup() {
    this.telemetry.debug('[SyncManager] Setting up')

    // can fail synchronously immediately (e.g., schema/migration validation errors)
    // or asynchronously (e.g., indexedDB errors synchronously OR asynchronously (!))
    const database = this.telemetry.trace({ name: 'db:init', attributes: { ...this.context.session.toJSON() } }, this.initDatabase)

    Object.entries(this.storeConfigsRegistry).forEach(([table, storeConfig]) => {
      this.storesRegistry[table] = this.createStore(storeConfig, database)
    })

    this.context.start()
    this.retry.start()

    this.strategyMap.forEach(({ models, strategies }) => {
      strategies.forEach((strategy) => {
        models.forEach((model) => {
          const store = this.storesRegistry[model.table]
          strategy.onTrigger(store, (reason) => {
            store.requestSync(reason)
          })
        })
        strategy.start()
      })
    })

    const effectTeardowns = this.effectMap.flatMap(({ models, effects }) => {
      return effects.map((effect) => effect(this.context, models.map(model => this.storesRegistry[model.table])))
    });

    contentProgressObserver.start(database).catch((error) => {
      this.telemetry.error('[SyncManager] Failed to start contentProgressObserver', error)
    })

    const teardown = async (force = false) => {
      this.telemetry.debug('[SyncManager] Tearing down')

      const clear = (force = false) => {
        if (force && this.destroyDatabase && database.adapter.dbName && database.adapter.underlyingAdapter) {
          return this.destroyDatabase(database.adapter.dbName, database.adapter.underlyingAdapter)
        } else {
          return database.write(() => database.unsafeResetDatabase())
        }
      }

      try {
        Object.values(this.storesRegistry).forEach((store) => {
          store.destroy()
        })

        this.runScope.abort()
        this.strategyMap.forEach(({ strategies }) => strategies.forEach((strategy) => strategy.stop()))
        effectTeardowns.forEach((teardown) => teardown())
        this.retry.stop()
        this.context.stop()

        contentProgressObserver.stop()
      } catch (error) {
        // capture, but don't rethrow
        this.telemetry.capture(error)
      }

      try {
        return clear(force);
      } catch (error) {
        if (!force) {
          return clear(true);
        }
        throw error
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
