import { SyncTelemetry } from "../telemetry/index";
import { SyncError, SyncUnexpectedError } from "./index";

/**
 * Safely executes a function within a "sync boundary" — ensuring that
 * any thrown or rejected errors (even from asynchronous code) are caught,
 * wrapped, and reported via SyncManager telemetry.
 *
 * This is especially useful for code that runs "out of band" — meaning
 * it's not directly part of the main sync pipeline, and errors might
 * otherwise not be decorated/reported how we like (like in an generic
 * app-wide global error handler).
 *
 * - Automatically catches both synchronous and asynchronous errors.
 * - Wraps unknown errors in `SyncUnexpectedError`, including optional `context`.
 * - Reports all handled errors through `SyncManager.telemetry.capture`.
 *
 * @param fn The function to run inside the error boundary.
 * @param context Optional contextual details to include in captured errors.
 * @returns The result of `fn`, or a promise that resolves to it.
 */

export function inBoundary<T, TContext extends Record<string, any>>(fn: (context: TContext) => T, context?: TContext): T;
export function inBoundary<T, TContext extends Record<string, any>>(fn: (context: TContext) => Promise<T>, context?: TContext): Promise<T>;
export function inBoundary<T, TContext extends Record<string, any>>(fn: (context: TContext) => T | Promise<T>, context?: TContext): T | Promise<T> {
  try {
    const result = fn(context || ({} as TContext));

    if (result instanceof Promise) {
      return result.catch((err: unknown) => {
        const wrapped = err instanceof SyncError ? err : new SyncUnexpectedError((err as Error).message, context);
        SyncTelemetry.getInstance().capture(wrapped)

        throw wrapped;
      });
    }

    return result;
  } catch (err: unknown) {
    const wrapped = err instanceof SyncError ? err : new SyncUnexpectedError((err as Error).message, context);
    SyncTelemetry.getInstance().capture(wrapped);

    throw wrapped;
  }
}
