import { SyncTelemetry, type SentryBrowserOptions } from ".";

export function errorHandler(event: ErrorEvent) {
  if (SyncTelemetry.getInstance()?.shouldIgnoreException(event.error)) {
    event.preventDefault() // doesn't reliably work in all browsers - error still logged to console
  }
}

export function rejectionHandler(event: PromiseRejectionEvent) {
  if (SyncTelemetry.getInstance()?.shouldIgnoreRejection(event.reason)) {
    event.preventDefault()
  }
}

type ReturnsUndefined<T extends (...args: any[]) => any> = (...args: Parameters<T>) => ReturnType<T> | undefined

/**
 * Sentry beforeSend hook to prevent sending events for ignored exceptions,
 * namely numerous eager watermelon queries that fail after IndexedDB failure
 */
export const floodPreventionSentryBeforeSend: ReturnsUndefined<NonNullable<SentryBrowserOptions['beforeSend']>> = (_event, hint) => {
  if (hint?.originalException && SyncTelemetry.getInstance()?.shouldIgnoreException(hint.originalException)) {
    return null
  }

  return undefined
}
