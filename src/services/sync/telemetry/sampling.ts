import { SyncTelemetry, SYNC_TELEMETRY_TRACE_PREFIX } from '.'
import { SyncError } from '../errors'
import type { ErrorEvent, TransactionEvent, EventHint, TracesSamplerSamplingContext } from '@sentry/core'

type BeforeSendResult<T> = T | PromiseLike<T | null> | null | undefined
type SamplerResult = number | boolean | undefined

export const syncSentryBeforeSend = (event: ErrorEvent, hint: EventHint): BeforeSendResult<ErrorEvent> => {
  const consoleArgs = event.extra?.arguments as unknown[] | undefined
  if (event.logger === 'console' && consoleArgs && SyncTelemetry.isSyncConsoleMessage(consoleArgs)) {
    return null
  }

  if (hint?.originalException instanceof SyncError) {
    if (hint.originalException.isReported()) {
      return null
    }

    // populate event with error data Sentry would otherwise ignore
    event.extra = {
      ...event.extra,
      details: hint.originalException.getDetails()
    }

    return event
  }

  return undefined
}

export const syncSentryBeforeSendTransaction = (event: TransactionEvent, hint: EventHint): BeforeSendResult<TransactionEvent> => {
  if (event.contexts?.trace?.op?.startsWith(SYNC_TELEMETRY_TRACE_PREFIX)) {
    // filter out noisy empty sync traces
    if (event.contexts.trace.op === `${SYNC_TELEMETRY_TRACE_PREFIX}sync` && event.spans?.length === 0) {
      return null
    }
  }

  return undefined
}

export const createSyncSentryTracesSampler = (sampleRate = 0.01) => {
  const sampler = (context: TracesSamplerSamplingContext): SamplerResult => {
    if (!context.name.startsWith(SYNC_TELEMETRY_TRACE_PREFIX)) return undefined
    return sampleRate
  }

  return sampler
}

