import { SyncAbortError } from './errors'

export default class SyncRunScope {
  private abortController: AbortController

  constructor() {
    this.abortController = new AbortController()
  }

  get signal(): AbortSignal {
    return this.abortController.signal
  }

  abort(reason?: string): void {
    this.abortController.abort(reason)
  }

  // simply rejects if aborted, otherwise runs the function
  // does NOT attempt to pass abort signal to the function
  abortable<T>(fn: () => Promise<T>): Promise<T> {
    if (this.signal.aborted) {
      reject(new SyncAbortError('Operation aborted', { reason: this.signal.reason }))
    }
    return fn()
  }
}
