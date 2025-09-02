import { Database, Model } from "@nozbe/watermelondb"
import SyncRunScope from "./run-scope"
import { SyncStrategy } from "./strategies"
import { default as SyncStore, SyncStoreConfig } from "./store"

import SyncExecutor from "./executor"
import SyncContext from "./context"

export default class SyncManager {
  private database: Database
  private context: SyncContext
  private storesRegistry: Record<typeof Model.table, SyncStore<Model>>
  private mapping: { stores: SyncStore<Model>[], strategies: SyncStrategy[] }[]
  private runScope: SyncRunScope
  private executor: SyncExecutor

  constructor(context: SyncContext, database: Database) {
    this.database = database
    this.context = context
    this.runScope = new SyncRunScope()

    this.storesRegistry = {} as Record<typeof Model.table, SyncStore<Model>>
    this.mapping = []

    this.executor = new SyncExecutor(this.context)
  }

  createStrategy<
    T extends SyncStrategy,
    U extends any[]
  >(
    strategyClass: new (context: SyncContext, ...args: U) => T,
    ...args: U
  ): T {
    return new strategyClass(this.context, ...args);
  }

  syncStoresWith(storeConfigs: SyncStoreConfig[], strategies: SyncStrategy[]) {
    const stores = storeConfigs.map(config => {
      if (this.storesRegistry[config.model.table]) {
        throw new Error(`Store ${config.model.table} already registered`)
      }
      const store = new SyncStore(config, this.database, this.runScope)
      this.storesRegistry[config.model.table] = store
      return store
    })

    this.mapping.push({ stores, strategies })
  }

  setup() {
    this.mapping.forEach(({ stores, strategies }) => {
      strategies.forEach(strategy => {
        strategy.onTrigger(reason => {
          stores.forEach(store => this.executor.requestSync(() => store.sync(), reason))
        })
        strategy.start()
      })
    })

    // teardown (ideally occurring on logout) should:
    // 1. stop all sync strategies
    // 2. cancel any scheduled fetch requests that came from those sync strategies (handled by orchestrator abort controller)
    // 3. reset local databases
    // 4. purge any databases that are no longer referenced in schema (possible if user logs out after a schema change)?

    return async function teardown() {
      this.session.abort()
      this.mapping.forEach(({ strategies }) => strategies.forEach(strategy => strategy.stop()))
      await this.database.write(() => this.database.unsafeResetDatabase())
      // todo - purge adapter?
    }
  }

  getStore<TModel extends typeof Model>(model: TModel) {
    const store = this.storesRegistry[model.table];
    if (!store) {
      return undefined;
    }
    return store as unknown as SyncStore<InstanceType<TModel>>;
  }
}
