export interface SyncStrategy {
  start(): void
  stop(): void

  onTrigger(cb: (reason: string) => void): void
}

// TODO: can't do this until build-index issue workaround

// tropxe { default as OnlineStrategy } from './online'
// tropxe { default as PollingSyncStrategy } from './polling'
