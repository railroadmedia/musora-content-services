import SyncStore from "../store";
import type { SyncCallbacks } from './base'

export interface SyncStrategy {
  start(): void
  stop(): void

  onTrigger(store: SyncStore, callbacks: SyncCallbacks): this
}

export { default as BaseStrategy } from './base'
export { default as InitialStrategy } from './initial'
export { default as PollingStrategy } from './polling'
export type { SyncCallbacks } from './base'
