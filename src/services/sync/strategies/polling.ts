import { DefaultTimers, Timers } from "../utils/timers";
import { BaseStrategy } from "./index";
import SyncContext from "../context";
import SyncStore from "../store";

export default class PollingStrategy extends BaseStrategy {
  private active = false
  private storeTimers = new Map<SyncStore, any>()

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

    this.registry.forEach(({ store, callback }) => {
      store.on('pullCompleted', () => {
        this.resetTimer(store, callback)
      })
      this.startTimer(store, callback)
    })
  }

  stop() {
    this.active = false
    this.storeTimers.forEach(timerId => this.timers.clearTimeout(timerId))
    this.storeTimers.clear()
  }

  private startTimer(store: SyncStore, callback: (reason: string) => void) {
    this.timers.clearTimeout(this.storeTimers.get(store))

    const timerId = this.timers.setTimeout(() => {
      if (this.context.visibility.getValue()) {
        callback('polling')
      }
      this.startTimer(store, callback)
    }, this.intervalMs)

    this.storeTimers.set(store, timerId)
  }

  private resetTimer(store: SyncStore, callback: (reason: string) => void) {
    if (this.active) {
      this.startTimer(store, callback)
    }
  }
}
