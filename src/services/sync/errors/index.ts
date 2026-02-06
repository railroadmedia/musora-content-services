import { type BaseIssue } from "valibot"
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

export class SyncInitError extends SyncError {
  constructor(error: unknown) {
    super('initError', { cause: error })
    this.name = 'SyncInitError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class SyncSetupError extends SyncError {
  constructor(error: unknown) {
    super('setupError', { cause: error })
    this.name = 'SyncSetupError'
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
  constructor(message: string, issue: BaseIssue<unknown>) {
    super(message, { issue })
    this.name = 'SyncValidationError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
