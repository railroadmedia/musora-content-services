import { SyncStrategy } from "./index";

export default abstract class BaseSyncStrategy implements SyncStrategy {
  protected triggerCallback?: (reason: string) => void
  abstract start(): void
  abstract stop(): void

  onTrigger(callback: (reason: string) => void): void {
    this.triggerCallback = callback
  }
}
