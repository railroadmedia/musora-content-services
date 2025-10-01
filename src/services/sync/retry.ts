import SyncContext from "./context"
import { SyncResponse } from "./fetch"
import { SyncTelemetry } from "./telemetry"

export default class SyncRetry {
  private readonly BASE_BACKOFF = 1_000
  private readonly MAX_BACKOFF = 8_000
  private readonly MAX_ATTEMPTS = 4

  private paused = false
  private backoffUntil = 0
  private failureCount = 0

  private unsubscribeConnectivity: () => void

  constructor(private readonly context: SyncContext, private readonly telemetry: SyncTelemetry) {}

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
  async request<T extends SyncResponse>(syncFn: () => Promise<T>, forceOne?: boolean) {
    let attempt = 0

    while (true) {
      if (!this.context.connectivity.getValue()) {
        this.telemetry.debug('[Retry] No connectivity - skipping')
        this.paused = true
        return { ok: false } as T
      }

      if (!forceOne) {
        const now = Date.now()
        if (now < this.backoffUntil) {
          await this.sleep(this.backoffUntil - now)
        }
      }

      attempt++
      const result = await this.telemetry.trace({ name: `retry:attempt:${attempt}`, op: 'retry:attempt' }, () => syncFn())

      if (result.ok) {
        this.resetBackoff()
        return result
      } else {
        this.scheduleBackoff()
        if (forceOne || attempt >= this.MAX_ATTEMPTS) return result
      }
    }
  }

  private resetBackoff() {
    if (this.backoffUntil !== 0 || this.failureCount !== 0) {
      this.telemetry.debug('[Retry] Resetting backoff')
      this.backoffUntil = 0
      this.failureCount = 0
    }
  }

  private scheduleBackoff() {
    this.failureCount++

    const exponentialDelay = this.BASE_BACKOFF * Math.pow(2, this.failureCount - 1)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5)
    const delayWithJitter = exponentialDelay + jitter

    this.backoffUntil = Date.now() + Math.min(this.MAX_BACKOFF, delayWithJitter)

    this.telemetry.debug('[Retry] Scheduling backoff', { failureCount: this.failureCount, backoffUntil: this.backoffUntil })
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
