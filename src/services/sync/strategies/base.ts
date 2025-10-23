import { SyncStrategy } from "./index";
import SyncContext from "../context";
import SyncStore from "../store";

export default abstract class BaseSyncStrategy implements SyncStrategy {
  protected registry: { callback: (reason: string) => void, store: SyncStore }[] = []
  abstract start(): void
  abstract stop(): void

  protected context: SyncContext

  constructor(context: SyncContext) {
    this.context = context
    this.registry = []
  }

  onTrigger(store: SyncStore, callback: (reason: string) => void): this {
    this.registry.push({ callback, store })
    return this
  }
}
