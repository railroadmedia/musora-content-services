import BaseModel from './models/Base'
import { Database } from '@nozbe/watermelondb'
import { DatabaseAdapter } from '@nozbe/watermelondb/adapters/type'
import SyncRunScope from './run-scope'
import { SyncStrategy } from './strategies'
import { default as SyncStore, SyncStoreConfig } from './store'

import { ModelClass, SyncUserScope } from './index'
import SyncRetry from './retry'
import SyncContext from './context'
import { SyncError } from './errors'
import { SyncEffect } from './effects'
import { SyncTelemetry } from './telemetry/index'
import createStoreConfigs from './store-configs'
import { contentProgressObserver } from '../awards/internal/content-progress-observer'

export type SyncTeardownMode = 'reset' | 'destroyOrReset' | 'abortWrites'

export default class SyncManager {
  private static counter = 0
  private static instance: SyncManager | null = null

  public static async assignAndSetupInstance(instance: SyncManager) {
    if (SyncManager.instance) {
      throw new SyncError('SyncManager already initialized')
    }

    SyncManager.instance = instance
    const teardown = await instance.setup()

    return async (mode: SyncTeardownMode = 'reset') => {
      SyncManager.instance = null
      return teardown(mode).catch((error) => {
        SyncManager.instance = instance // restore instance on teardown failure
        throw error
      })
    }
  }

  public static assignAndSetupInstanceDangerously(instance: SyncManager) {
    if (SyncManager.instance) {
      throw new SyncError('SyncManager already initialized')
    }
    SyncManager.instance = instance

    // we don't want to reset the db when it's just a regular page reload
    // but note that it skips an initial comparison of userId <-> storedUserId
    // (this lets us keep this particular setup flow synchronous (important because
    // we don't need a bunch of ready checks in all of our melon query consumers))
    const teardown = instance.setupWithoutDatabaseReset()

    return async (mode: SyncTeardownMode = 'reset') => {
      SyncManager.instance = null
      return teardown(mode).catch((error) => {
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
  private userScope: SyncUserScope

  private storeConfigsRegistry: Record<string, SyncStoreConfig<any>>
  private storesRegistry: Record<string, SyncStore<any>>
  private runScope: SyncRunScope
  private retry: SyncRetry
  private strategyMap: { models: ModelClass[]; strategies: SyncStrategy[] }[]
  private effectMap: { models: ModelClass[]; effects: SyncEffect[] }[]

  private initDatabase: () => Database
  private destroyDatabase?: (dbName: string, adapter: DatabaseAdapter) => Promise<void>
  private abortWritesToDatabase?: (adapter: DatabaseAdapter) => Promise<void>

  private teardownPromise: Promise<void> | null = null

  constructor(
    userScope: SyncUserScope,
    context: SyncContext,
    initDatabase: () => Database,
    teardownDatabase: {
      destroy?: (dbName: string, adapter: DatabaseAdapter) => Promise<void>
      abort?: (adapter: DatabaseAdapter) => Promise<void>
    } = {}
  ) {
    this.id = (SyncManager.counter++).toString()

    this.telemetry = SyncTelemetry.getInstance()!
    this.context = context
    this.userScope = userScope

    this.initDatabase = initDatabase
    this.destroyDatabase = teardownDatabase.destroy
    this.abortWritesToDatabase = teardownDatabase.abort

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
      this.userScope,
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

  async setup() {
    this.telemetry.debug('[SyncManager] Setting up with database reset')
    const database = this._initDatabase()

    // Default safe behavior is to always reset the db (i.e., on login)
    // (unless the provided intended user matches the already stored user)
    await database.write(async () => {
      const storedUserId = await database.localStorage.get<number>('userId');
      if (!storedUserId || storedUserId !== this.userScope.initialId) {
        await database.unsafeResetDatabase()
        await database.localStorage.set('userId', this.userScope.initialId)
      }
    })

    return this._setup(database)
  }

  setupWithoutDatabaseReset() {
    this.telemetry.debug('[SyncManager] Setting up synchronously without proactive reset')
    const database = this._initDatabase()
    return this._setup(database)
  }

  _initDatabase() {
    // can fail synchronously immediately (e.g., schema/migration validation errors)
    // or asynchronously (e.g., indexedDB errors synchronously OR asynchronously (!))
    const database = this.telemetry.trace(
      { name: 'db:init', attributes: { ...this.context.session.toJSON() } },
      this.initDatabase
    )
    return database
  }

  _setup(database: Database) {
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
      return effects.map((effect) =>
        effect(
          this.context,
          models.map((model) => this.storesRegistry[model.table])
        )
      )
    })

    contentProgressObserver.start(database).catch((error) => {
      this.telemetry.error('[SyncManager] Failed to start contentProgressObserver', error)
    })

    const teardown = async (mode: SyncTeardownMode = 'reset') => {
      if (this.teardownPromise) {
        this.telemetry.debug(
          '[SyncManager] Teardown already in progress, returning existing promise'
        )
        return this.teardownPromise
      }

      this.teardownPromise = (async () => {
        this.telemetry.debug('[SyncManager] Tearing down')

        const clear = (mode: SyncTeardownMode) => {
          if (mode === 'abortWrites') {
            if (!this.abortWritesToDatabase) {
              throw new SyncError('Cannot abort writes to database - implementation not provided')
            }
            if (!database.adapter.underlyingAdapter) {
              throw new SyncError('Cannot abort writes to database - adapter not available')
            }

            return this.abortWritesToDatabase(database.adapter.underlyingAdapter)
          }

          if (mode === 'destroyOrReset') {
            try {
              if (!this.destroyDatabase) {
                throw new SyncError(
                  'Cannot destroy or reset database - destroy implementation not provided'
                )
              }
              if (!database.adapter.underlyingAdapter) {
                throw new SyncError('Cannot destroy  database - adapter not available')
              }
              return this.destroyDatabase(
                database.adapter.dbName,
                database.adapter.underlyingAdapter
              )
            } catch (err: unknown) {
              this.telemetry.capture(err)
              return database.write(() => database.unsafeResetDatabase())
            }
          }

          return database.write(() => database.unsafeResetDatabase())
        }

        try {
          Object.values(this.storesRegistry).forEach((store) => {
            store.destroy()
          })

          this.runScope.abort()
          this.strategyMap.forEach(({ strategies }) =>
            strategies.forEach((strategy) => strategy.stop())
          )
          effectTeardowns.forEach((teardown) => teardown())
          this.retry.stop()
          this.context.stop()

          contentProgressObserver.stop()
        } catch (error) {
          // capture, but don't rethrow
          this.telemetry.capture(error)
        }

        return clear(mode)
      })().finally(() => {
        this.teardownPromise = null
      })

      return this.teardownPromise
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
