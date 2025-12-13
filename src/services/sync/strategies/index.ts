import SyncStore from "../store";

export interface SyncStrategy {
  start(): void
  stop(): void

  onTrigger(store: SyncStore, callback: (reason: string) => void): this
}

export { default as BaseStrategy } from './base'
export { default as InitialStrategy } from './initial'
export { default as PollingStrategy } from './polling'
export { default as TriggerStrategy } from './trigger'
