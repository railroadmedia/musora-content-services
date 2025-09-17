import SyncStore from "./store"
import telemetry from "./telemetry"

export class SyncError extends Error {
  constructor(message: string, name: string = 'SyncError', context?: any) {
    super(message)
    this.name = name
    telemetry.error(this.name, this.message, context)
  }
}

export class SyncStoreError extends SyncError {
  constructor(message: string, store: SyncStore, context?: any) {
    super(message, 'SyncStoreError', context)
    context.store = store
  }
}
