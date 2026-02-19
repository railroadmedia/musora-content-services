import { SyncStrategy } from "./index";
import SyncContext from "../context";
import SyncStore from "../store";

type SyncCallback = (reason: string) => void

type SyncCallbacks = {
  callback: SyncCallback
  requestSync: SyncCallback
  requestPull: SyncCallback
}

type RegistryEntry = SyncCallbacks & { store: SyncStore }

export default abstract class BaseSyncStrategy implements SyncStrategy {
  protected registry: RegistryEntry[] = []
  abstract start(): void
  abstract stop(): void

  protected context: SyncContext

  constructor(context: SyncContext) {
    this.context = context
    this.registry = []
  }

  onTrigger(store: SyncStore, callbacks: SyncCallbacks): this {
    this.registry.push({ ...callbacks, store })
    return this
  }
}
