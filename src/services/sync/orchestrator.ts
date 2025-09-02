import SyncStore from "./store";
import { SyncStrategy } from "./strategies";
import SyncExecutor from "./executor";

export default class SyncOrchestrator {
  private started = false
  private mapping: { stores: SyncStore[], strategies: SyncStrategy[] }[]

  constructor(
    private executor: SyncExecutor,
    mapping: { stores: SyncStore[], strategies: SyncStrategy[] }[]
  ) {
    this.mapping = mapping
  }

  start() {
    if (this.started) return
    this.started = true

    this.mapping.forEach(({ stores, strategies }) => {
      strategies.forEach(strategy => {
        strategy.onTrigger(reason => {
          stores.forEach(store => this.executor.requestSync(() => store.sync(), reason))
        })
        strategy.start()
      })
    })
  }

  stop() {
    if (!this.started) return
    this.mapping.forEach(({ strategies }) => strategies.forEach(strategy => strategy.stop()))
    this.started = false
  }
}
