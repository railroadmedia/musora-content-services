import { Database, Model } from "@nozbe/watermelondb"
import SyncSession from "./session"
import { SyncStrategy } from "./strategies"
import { default as SyncStore, SyncStoreConfig } from "./store"

import SyncExecutor from "./executor"
import SyncOrchestrator from "./orchestrator"

export default class SyncManager {
  private session: SyncSession
  private database: Database
  private orchestrator: SyncOrchestrator
  private executor: SyncExecutor

  private storesRegistry: Record<typeof Model.table, SyncStore<Model>>

  constructor(database: Database, mappings: { stores: SyncStoreConfig[], strategies: SyncStrategy[] }[]) {
    this.database = database

    this.session = new SyncSession()
    this.executor = new SyncExecutor()

    this.storesRegistry = {} as Record<typeof Model.table, SyncStore<Model>>

    for (const { stores } of mappings) {
      stores.forEach(store => {
        this.storesRegistry[store.model.table] = this.createStore(store)
      })
    }

    this.orchestrator = new SyncOrchestrator(this.executor, mappings.map(({ stores, strategies }) => {
      return {
        stores: stores.map(store => this.storesRegistry[store.model.table]),
        strategies,
      }
    }))
  }

  setup() {
    this.orchestrator.start()

    // teardown (ideally occurring on logout) should:
    // 1. stop all sync strategies
    // 2. cancel any scheduled fetch requests that came from those sync strategies (handled by orchestrator abort controller)
    // 3. reset local databases
    // 4. purge any databases that are no longer referenced in schema (possible if user logs out after a schema change)?

    return async function teardown() {
      this.orchestrator.stop()
      this.session.abort()
      await this.database.write(() => this.database.unsafeResetDatabase())
      // todo - purge adapter?
    }
  }

  getStore<TModel extends typeof Model>(model: TModel) {
    return this.storesRegistry[model.table] as SyncStore<InstanceType<TModel>>
  }

  private createStore(config: SyncStoreConfig) {
    return new SyncStore(config, this.database, this.session)
  }
}
