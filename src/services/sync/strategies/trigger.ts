import { BaseStrategy } from '.'

// A strategy that exposes a method to trigger sync on demand
// Useful for unsynced logout warning use case
export default class TriggerStrategy extends BaseStrategy {
  start() {}
  stop() {}

  trigger() {
    this.registry.forEach(({ callback }) => {
      callback('trigger')
    })
  }

  triggerConditionally(shouldTrigger: boolean) {
    if (shouldTrigger) {
      this.trigger()
    }
  }
}
