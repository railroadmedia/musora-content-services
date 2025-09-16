import SyncContext from "./context"
import { SyncResponseBase } from "./fetch"

export default class SyncBackoff {
  private readonly BASE_BACKOFF = 1_000
  private readonly MAX_BACKOFF = 30_000

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

  async request(syncFn: () => Promise<SyncResponseBase>) {
    if (!this.context.connectivity.getValue()) {
      this.paused = true
      return { ok: false }
    }

    const now = Date.now()
    if (now < this.backoffUntil) {
      const waitMs = this.backoffUntil - now
      await this.sleep(waitMs)
    }

    const result = await syncFn()

    if (!result.ok) {
      this.scheduleBackoff()
    } else {
      this.resetBackoff()
    }

    return result
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

    const finalDelay = Math.min(this.MAX_BACKOFF, delayWithJitter)
    this.backoffUntil = Date.now() + finalDelay
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
