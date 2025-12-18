import SyncStore from "../store"

type ErrorDetails = Record<string, unknown>
type Without<TRecord, T extends string> = {
  [K in T]?: never
} & TRecord

export class SyncError extends Error {
  private _reported = false
  readonly details?: ErrorDetails

  constructor(message: string, details?: ErrorDetails) {
    super(message)
    this.name = 'SyncError'
    Object.setPrototypeOf(this, new.target.prototype)

    this.details = details
  }

  markReported() {
    this._reported = true
  }

  isReported() {
    return this._reported
  }

  getDetails() {
    return this.details
  }
}

export class SyncStoreError extends SyncError {
  constructor(message: string, store: SyncStore, details?: Without<ErrorDetails, 'store'>) {
    super(message, { ...details, store })
    this.name = 'SyncStoreError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// useful for transforming non-sync-related errors into one
// that captures surrounding details (e.g., table name)
export class SyncUnexpectedError extends SyncError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, details)
    this.name = 'SyncUnexpectedError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class SyncValidationError extends SyncError {
  constructor(message: string, value: any, expected: any) {
    super('validationError', { message: message, value: value, expected: expected })
    this.name = 'SyncValidationError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
