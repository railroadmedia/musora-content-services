import SyncContext from "./context"
import { SyncResponse } from "./fetch"
import telemetry from "./telemetry"

export default class SyncBackoff {
  private readonly BASE_BACKOFF = 1_000
  private readonly MAX_BACKOFF = 8_000
  private readonly MAX_ATTEMPTS = 4

  private paused = false
  private backoffUntil = 0
  private failureCount = 0

  private context: SyncContext
  private unsubscribeConnectivity: () => void

  constructor(context: SyncContext) {
    this.context = context
  }

  start() {
    this.unsubscribeConnectivity = this.context.connectivity.subscribe(isOnline => {
      if (isOnline && this.paused) {
        this.paused = false
        this.resetBackoff()
      }
    })
  }

  stop() {
    this.unsubscribeConnectivity?.()
  }

  /**
   * Runs the given syncFn with automatic retries.
   * Returns the first successful result or the last failed result after retries.
   */
  async request<T extends SyncResponse>(syncFn: () => Promise<T>) {
    if (!this.context.connectivity.getValue()) {
      telemetry.info('[Backoff] No connectivity - skipping')
      this.paused = true
      return { ok: false } as T
    }

    let attempt = 0

    while (true) {
      const now = Date.now()
      if (now < this.backoffUntil) {
        await this.sleep(this.backoffUntil - now)
      }

      attempt++

      try {
        const result = await syncFn()

        if (result.ok) {
          this.resetBackoff()
          return result
        } else {
          this.scheduleBackoff()
          if (attempt >= this.MAX_ATTEMPTS) return result
          // otherwise loop to retry
        }
      } catch (err) {
        // client-side exception; bubble up immediately
        throw err
      }
    }
  }

  private resetBackoff() {
    this.backoffUntil = 0
    this.failureCount = 0
  }

  private scheduleBackoff() {
    this.failureCount++

    const exponentialDelay = this.BASE_BACKOFF * Math.pow(2, this.failureCount - 1)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5)
    const delayWithJitter = exponentialDelay + jitter

    this.backoffUntil = Date.now() + Math.min(this.MAX_BACKOFF, delayWithJitter)
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
