import type SyncContext from "./context"
import type SyncStore from "./store"

export default abstract class SyncConcurrencySafety {
  protected context: SyncContext
  protected stores: SyncStore[]

  constructor(context: SyncContext, stores: SyncStore[]) {
    this.context = context
    this.stores = stores
  }

  abstract start(): void
  abstract stop(): void
}
