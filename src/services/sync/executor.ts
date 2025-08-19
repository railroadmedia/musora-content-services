export default class SyncExecutor {
  private BASE_BACKOFF = 1000 // Start with 1 second
  private MAX_BACKOFF = 60000 // Cap at 1 minute
  private MAX_RETRIES = 6 // Maximum number of retry attempts

  private syncing = false
  private backoffUntil = 0
  private failureCount = 0

  async requestSync(syncFn: () => Promise<void>, reason: string) {
    const now = Date.now()
    if (this.syncing || now < this.backoffUntil) {
      return
    }

    this.syncing = true
    try {
      await syncFn()
      this.resetBackoff()
    } catch (e) {
      this.scheduleBackoff()
    } finally {
      this.syncing = false
    }
  }

  private resetBackoff() {
    this.backoffUntil = 0
    this.failureCount = 0
  }

  private scheduleBackoff() {
    this.failureCount++

    if (this.failureCount > this.MAX_RETRIES) {
      return
    }

    // exponential backoff: base * (2 ^ failureCount)
    const exponentialDelay = this.BASE_BACKOFF * Math.pow(2, this.failureCount - 1)

    // add jitter (+/- 25% randomization) to prevent thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5)
    const delayWithJitter = exponentialDelay + jitter

    // cap at maximum backoff time
    const finalDelay = Math.min(this.MAX_BACKOFF, delayWithJitter)

    this.backoffUntil = Date.now() + finalDelay
  }
}
