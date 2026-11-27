import { SyncTelemetry } from '../telemetry/index'

type EventMap = Record<string, any[]>;

export default class EventEmitter<Events extends EventMap> {
  private events: {
    [K in keyof Events]?: Array<(...args: Events[K]) => void>
  } = {};

  on<K extends keyof Events>(event: K, fn: (...args: Events[K]) => void): () => void {
    (this.events[event] ||= []).push(fn);
    return () => this.off(event, fn);
  }

  off<K extends keyof Events>(event: K, fn?: (...args: Events[K]) => void) {
    if (!fn) {
      delete this.events[event];
    } else {
      this.events[event] = this.events[event]?.filter(f => f !== fn) || [];
    }
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]) {
    // A failing listener is reported and skipped, so it can't fail the code that emitted
    // the event or stop the listeners after it.
    this.events[event]?.forEach(fn => {
      try {
        fn(...args);
      } catch (error) {
        SyncTelemetry.getInstance()?.warn('[EventEmitter] listener failed', { extra: error });
      }
    });
  }
}
