export interface Timers {
  setTimeout(fn: () => void, ms: number): any
  clearTimeout(id: any): void
}

export const DefaultTimers: Timers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
}
