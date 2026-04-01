export default class SyncRunScope {
  private abortController: AbortController

  constructor() {
    this.abortController = new AbortController()
  }

  get signal(): AbortSignal {
    return this.abortController.signal
  }

  abort(): void {
    this.abortController.abort()
  }

  abortable<T>(fn: () => Promise<T>): Promise<T> {
    if (this.signal.aborted) {
      return Promise.reject(this.signal.reason)
    }
    return fn()
  }
}
