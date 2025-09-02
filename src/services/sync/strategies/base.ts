import { SyncStrategy } from "./index";
import SyncContext from "../context";

export default abstract class BaseSyncStrategy implements SyncStrategy {
  protected triggerCallback?: (reason: string) => void
  abstract start(): void
  abstract stop(): void

  protected context: SyncContext

  constructor(context: SyncContext) {
    this.context = context
  }

  onTrigger(callback: (reason: string) => void): void {
    this.triggerCallback = callback
  }
}
