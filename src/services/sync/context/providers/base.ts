import { EventEmitter } from "../../utils/event-emitter"

export default abstract class BaseContextProvider<T> {
  private emitter = new EventEmitter<{ change: [T] }>()
  abstract getValue(): T

  setup() {
    return () => {}
  }

  subscribe(listener: (value: T) => void) {
    return this.emitter.on('change', listener)
  }

  protected notifyListeners = () => this.emitter.emit('change', this.getValue())
}
