export class EventEmitter {
  private events: Record<string, Function[]> = {}

  on(event: string, fn: Function): () => void {
    (this.events[event] ||= []).push(fn)
    return () => this.off(event, fn)
  }

  off(event: string, fn?: Function) {
    if (!fn) delete this.events[event]
    else this.events[event] = this.events[event]?.filter(f => f !== fn) || []
  }

  emit(event: string, ...args: any[]) {
    this.events[event]?.forEach(fn => fn(...args))
  }
}
