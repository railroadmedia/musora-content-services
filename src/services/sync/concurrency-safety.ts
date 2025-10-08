import type SyncContext from "./context"
import type SyncStore from "./store"

export type SyncConcurrencySafetyMechanism = (context: SyncContext, stores: SyncStore[]) => () => void
