import SyncContext from "./context"

export default class SyncExecutor {
  private BASE_BACKOFF = 1000 // Start with 1 second
  private MAX_BACKOFF = 60000 // Cap at 1 minute
  private MAX_RETRIES = 6 // Maximum number of retry attempts

  private syncing = false
  private paused = false
  private backoffUntil = 0
  private failureCount = 0

  private context: SyncContext

  constructor(context: SyncContext) {
    this.context = context

    // When we come back online, reset the paused state and backoff timer
    // so the next sync attempt can proceed immediately.
    this.context.connectivityProvider.subscribe(isOnline => {
      if (isOnline && this.paused) {
        this.paused = false
        this.resetBackoff()
      }
    })
  }

  async requestSync(syncFn: () => Promise<void>, reason: string) {
    const now = Date.now()

    // 1. Don't sync if already syncing
    if (this.syncing) {
      return
    }

    // 2. If offline, pause execution and wait for connectivity
    if (!this.context.connectivityProvider.getValue()) {
      this.paused = true
      return
    }

    // 3. Respect the backoff timer for online failures
    if (now < this.backoffUntil) {
      return
    }

    this.syncing = true
    try {
      await syncFn()
      this.resetBackoff()
    } catch (e) {
      // Only schedule a backoff if the failure happened while online.
      // If we're offline, the connectivity listener will handle resuming.
      if (this.context.connectivityProvider.getValue()) {
        this.scheduleBackoff()
      } else {
        this.paused = true
      }
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
