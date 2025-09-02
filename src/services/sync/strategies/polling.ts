import { DefaultTimers, Timers } from "../utils/timers";
import { BaseStrategy } from "./index";
import SyncContext from "../context";

export default class PollingStrategy extends BaseStrategy {
  private active = false
  private intervalId?: any

  constructor(
    context: SyncContext,
    private intervalMs: number,
    private readonly timers: Timers = DefaultTimers
  ) {
    super(context)
  }

  start() {
    if (this.active) return
    this.active = true

    this.tick()
  }

  stop() {
    this.active = false
    this.timers.clearTimeout(this.intervalId)
  }

  private tick() {
    if (!this.active) return
    this.triggerIfVisible()
    this.intervalId = this.timers.setTimeout(() => this.tick(), this.intervalMs)
  }

  private triggerIfVisible() {
    if (this.context.visibilityProvider.getValue()) {
      this.triggerCallback?.('polling')
    }
  }
}
