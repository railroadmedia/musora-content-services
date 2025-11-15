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
        reject(this.signal.reason)
        return
      }

      fn().then(resolve).catch(reject)

      this.signal.addEventListener('abort', () => {
        reject(this.signal.reason)
      })
    })
  }
}
