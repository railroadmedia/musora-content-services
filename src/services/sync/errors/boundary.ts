import SyncManager from "../manager";
import { SyncError, SyncUnexpectedError } from "./index";

export function inBoundary<T>(fn: () => T | Promise<T>, details?: Record<string, any>): T | Promise<T> {
  try {
    const result = fn();

    if (result instanceof Promise) {
      return result.catch((err: unknown) => {
        const wrapped = err instanceof SyncError ? err : new SyncUnexpectedError((err as Error).message, details);
        SyncManager.getInstance().telemetry.capture(wrapped);
      });
    }

    return result;
  } catch (err: unknown) {
    const wrapped = err instanceof SyncError ? err : new SyncUnexpectedError((err as Error).message, details);
    SyncManager.getInstance().telemetry.capture(wrapped);
  }
}
