import SyncContext from "./context"
import { SyncResponse } from "./fetch"
import { SyncTelemetry } from "./telemetry/index"

export default class SyncRetry {
  static readonly BASE_BACKOFF = 1_000
  static readonly MAX_BACKOFF = 8_000
  static readonly MAX_ATTEMPTS = 4


  private paused = false
  private backoffUntil = 0
  private failureCount = 0

  private unsubscribeConnectivity: (() => void) | null = null

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
    this.unsubscribeConnectivity = null
  }

  /**
   * Runs the given syncFn with automatic retries.
   * Returns the first successful result or the last failed result after retries.
   */
  async request<T extends SyncResponse>(
    syncFn: (attempt: number) => Promise<T>,
    options: { onFail?: () => void } = {}
  ) {
    let attempt = 0

    while (true) {
      const now = Date.now()
      if (now < this.backoffUntil) {
        await this.sleep(this.backoffUntil - now)
      }

      attempt++

      if (!this.context.connectivity.getValue()) {
        this.telemetry.debug('[Retry] No connectivity - skipping')
        return { ok: false, failureType: 'fetch', isRetryable: false } as T
      }

      const result = await syncFn(attempt)

      if (!result) return result

      if (result.ok === true) {
        this.resetBackoff()
        return result
      } else {
        if ('isRetryable' in result && result.isRetryable) {
          this.scheduleBackoff()
          if (attempt >= SyncRetry.MAX_ATTEMPTS) {
            options.onFail?.()
            return result
          }
        } else {
          return result
        }
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

    const exponentialDelay = SyncRetry.BASE_BACKOFF * Math.pow(2, this.failureCount - 1)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5)
    const delayWithJitter = exponentialDelay + jitter

    this.backoffUntil = Date.now() + Math.min(SyncRetry.MAX_BACKOFF, delayWithJitter)

    this.telemetry.debug('[Retry] Scheduling backoff', { failureCount: this.failureCount, backoffUntil: this.backoffUntil })
  }

  protected sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
