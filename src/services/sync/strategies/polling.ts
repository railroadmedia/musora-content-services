import { DefaultTimers, Timers } from "../utils/timers";
import { BaseSyncStrategy } from "./base";

export default class PollingSyncStrategy extends BaseSyncStrategy {
  private active = false
  private intervalId?: any

  constructor(
    private intervalMs: number,
    private readonly timers: Timers = DefaultTimers
  ) {
    super()
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
    this.triggerCallback?.('polling')
    this.intervalId = this.timers.setTimeout(() => this.tick(), this.intervalMs)
  }
}
