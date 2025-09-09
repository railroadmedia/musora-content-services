import SyncStore from "../store";

export interface SyncStrategy {
  start(): void
  stop(): void

  onTrigger(store: SyncStore, callback: (reason: string) => void): this
}

export { default as BaseStrategy } from './base'
export { default as PollingStrategy } from './polling'
