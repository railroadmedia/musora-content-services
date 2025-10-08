import { SYNC_TELEMETRY_TRACE_PREFIX, type SentryBrowserOptions } from './index'
import SyncManager from '../manager'
import { SyncError } from '../errors'

export const syncSentryBeforeSend: SentryBrowserOptions['beforeSend'] = (event, hint) => {
  if (event.logger === 'console' && SyncManager.getInstance().telemetry.shouldIgnoreConsole()) {
    return null
  }

  if (hint?.originalException instanceof SyncError) {
    event.extra = {
      ...event.extra,
      details: hint.originalException.getDetails()
    }

    return event
  }

  return undefined
}

export const syncSentryTracesSampler: SentryBrowserOptions['tracesSampler'] = (context) => {
  if (!context.name.startsWith(SYNC_TELEMETRY_TRACE_PREFIX)) {
    return undefined
  }

  const { parentSampled, attributes } = context

  if (parentSampled) {
    return true
  }

  // todo - return 1.0 in development+staging

  if (attributes?.userId) {
    return userBucketedSampler(attributes.userId as string | number, 0.1)
  }

  return false
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
