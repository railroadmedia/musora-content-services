import SyncStore from "./store";
import { SyncStrategy } from "./strategies";
import SyncExecutor from "./executor";

export default class SyncStoreOrchestrator {
  private started = false
  private abortController: AbortController

  constructor(
    private executor: SyncExecutor,
    private mapping: { stores: SyncStore[], strategies: SyncStrategy[] }[]
  ) {
    this.abortController = new AbortController()
  }

  start() {
    if (this.started) return
    this.started = true

    this.mapping.forEach(({ stores, strategies }) => {
      strategies.forEach(strategy => {
        strategy.onTrigger(reason => {
          stores.forEach(store => this.executor.requestSync(() => store.sync(this.abortController.signal), reason))
        })
        strategy.start()
      })
    })
  }

  stop() {
    this.mapping.forEach(({ strategies }) => strategies.forEach(strategy => strategy.stop()))
    this.abortController.abort()
  }
}
