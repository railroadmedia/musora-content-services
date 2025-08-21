import SyncStore from "./store";
import { SyncStrategy } from "./strategies";
import SyncExecutor from "./executor";

export default class SyncStoreOrchestrator {
  constructor(
    private executor: SyncExecutor,
    private mapping: { stores: SyncStore[], strategies: SyncStrategy[] }[]
  ) {
  }

  start() {
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
    this.mapping.forEach(({ strategies }) => strategies.forEach(strategy => strategy.stop()))
  }
}
