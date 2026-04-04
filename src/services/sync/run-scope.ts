import { SyncAbortError } from './errors'

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
    return new Promise((resolve, reject) => {
      if (this.signal.aborted) {
        return Promise.reject(new SyncAbortError('Operation aborted', { reason: this.signal.reason }))
      }

      fn().then(resolve).catch(reject)

      this.signal.addEventListener('abort', () => {
        reject(this.signal.reason)
      })
    })
  }
}
