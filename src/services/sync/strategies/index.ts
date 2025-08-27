export interface SyncStrategy {
  start(): void
  stop(): void

  onTrigger(cb: (reason: string) => void): void
}

export { default as BaseStrategy } from './base'
export { default as PollingStrategy } from './polling'
