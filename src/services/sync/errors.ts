import SyncStore from "./store"
import telemetry from "./telemetry"

export class SyncError extends Error {
  constructor(message: string, context?: any, name: string = 'SyncError') {
    super(message)
    this.name = name
    telemetry.error(this.name, this.message, context)
  }
}

export class SyncStoreError extends SyncError {
  constructor(message: string, store: SyncStore, context?: any) {
    super(message, context, 'SyncStoreError')
    context.store = store
  }
}
