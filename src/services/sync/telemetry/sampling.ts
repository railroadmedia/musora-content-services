import { SyncTelemetry, SYNC_TELEMETRY_TRACE_PREFIX, type SentryBrowserOptions } from '.'
import { SyncError } from '../errors'

type ReturnsUndefined<T extends (...args: any[]) => any> = (...args: Parameters<T>) => ReturnType<T> | undefined

export const syncSentryBeforeSend: ReturnsUndefined<NonNullable<SentryBrowserOptions['beforeSend']>> = (event, hint) => {
  if (event.logger === 'console' && SyncTelemetry.getInstance()?.shouldIgnoreConsole()) {
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

export const syncSentryBeforeSendTransaction: ReturnsUndefined<NonNullable<SentryBrowserOptions['beforeSendTransaction']>> = (event, hint) => {
  if (event.contexts?.trace?.op?.startsWith(SYNC_TELEMETRY_TRACE_PREFIX)) {
    // filter out noisy empty sync traces
    if (event.contexts.trace.op === `${SYNC_TELEMETRY_TRACE_PREFIX}sync` && event.spans?.length === 0) {
      return null
    }
  }

  return undefined
}

export const createSyncSentryTracesSampler = (sampleRate = 0.1) => {
  const sampler: ReturnsUndefined<NonNullable<SentryBrowserOptions['tracesSampler']>> = (context) => {
    if (!context.name.startsWith(SYNC_TELEMETRY_TRACE_PREFIX)) {
      return undefined
    }

    const { parentSampled, attributes } = context

    if (parentSampled) {
      return true
    }

    if (attributes?.userId) {
      return userBucketedSampler(attributes.userId as string | number, sampleRate)
    }

    return undefined
  }

  return sampler
}

/**
 * Returns a sampling decision (0 or 1) based on user ID and rotation period.
 *
 * @param userId - string or number uniquely identifying the user
 * @param sampleRate - fraction of users to include (0..1)
 * @param rotationPeriodMs - rotation period in milliseconds (e.g., 1 day, 1 week)
 */
function userBucketedSampler(
  userId: string | number,
  sampleRate: number,
  rotationPeriodMs: number = 7 * 24 * 60 * 60 * 1000 // default: 1 week
): 0 | 1 {
  const uid = typeof userId === 'string' ? hashString(userId) : userId;
  const now = Date.now();
  const bucket = (uid + Math.floor(now / rotationPeriodMs)) % 100;
  return bucket < sampleRate * 100 ? 1 : 0;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}
