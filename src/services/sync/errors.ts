import SyncStore from "./store"
import telemetry from "./telemetry"

export class SyncError extends Error {
  constructor(message: string, context?: any) {
    super(message)
    this.name = 'SyncError'
    telemetry.error(this.name, this.message, context)
  }
}

export class SyncStoreError extends SyncError {
  constructor(message: string, store: SyncStore, context?: any) {
    super(message, context)
    context.store = store
    this.name = 'SyncStoreError'
  }
}
