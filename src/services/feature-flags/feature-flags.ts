/**
 * @module FeatureFlags
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import type { Brand } from '../../lib/brands'
import { globalConfig } from '../config'
import type {
  EvaluationReason,
  ExposureReport,
  FeatureFlagEntry,
  FeatureFlagPayload,
  FlagType,
} from './types'

const FLAGS_URL = '/api/feature/v1/flags'
const EXPOSURES_URL = '/api/feature/v1/exposures'

const REFRESH_AFTER_MS = 60_000

/**
 * How long a failed fetch is left alone before a read may try again.
 *
 * Without it a failure retries on every single read: nothing is held, so the
 * staleness check is true forever, and reads happen in render paths. A backend
 * outage would turn into a request per read per component.
 *
 * A flat floor rather than exponential backoff. Reads are already throttled by
 * REFRESH_AFTER_MS once anything succeeds, so this only governs the outage case,
 * and a fixed five seconds is enough to turn a hot loop into a trickle.
 */
const RETRY_AFTER_MS = 5_000
const MAX_EXPOSURES_PER_REQUEST = 50
const FLUSH_DELAY_MS = 50

/**
 * The server discards every other reason, so posting them is a round trip that
 * cannot record anything.
 */
const RECORDABLE_REASONS: EvaluationReason[] = ['rollout', 'rule', 'override', 'holdout']

/**
 * Held per brand, because brand is a targeting attribute: one key can resolve to
 * different variants on two brands, so one shared snapshot would answer for
 * whichever brand happened to be fetched first.
 */
let snapshots: Record<string, FeatureFlagPayload> = {}
let fetchedAt: Record<string, number> = {}
let attemptedAt: Record<string, number> = {}
let inFlight: Record<string, Promise<void>> = {}

let pending: ExposureReport[] = []
let reported = new Set<string>()
let flushHandle: ReturnType<typeof setTimeout> | null = null
let warned = new Set<string>()
let teardownListener: (() => void) | null = null

/**
 * Reading a string flag with a boolean accessor answers false, which is
 * indistinguishable from a boolean flag that is off -- so it is said out loud
 * rather than left to look like a working flag that is simply disabled.
 *
 * A warning, not a throw: the read still answers, and a flag whose type was
 * changed in the admin UI must not take a page down.
 *
 * Warned once per flag and accessor, because these are read in render paths.
 */
function warnOnTypeMismatch(
  flagKey: string,
  entry: FeatureFlagEntry | undefined,
  accessor: string,
  expected: FlagType
): void {
  if (entry === undefined || entry.type === expected || warned.has(`${flagKey}:${accessor}`)) {
    return
  }

  warned.add(`${flagKey}:${accessor}`)
  console.warn(
    `featureFlags.${accessor}('${flagKey}') reads a ${expected} flag, but '${flagKey}' is typed ${entry.type}. ` +
      `Use ${entry.type === 'string' ? 'variant()' : 'value()'} instead.`
  )
}

async function load(brand: Brand): Promise<void> {
  const client = new HttpClient(globalConfig.baseUrl)

  // Recorded before the request, so it is set whether or not the request
  // succeeds. fetchedAt is only moved on success, so a failure leaves the held
  // snapshot stale rather than passing a failed fetch off as a fresh one.
  attemptedAt[brand] = Date.now()

  snapshots[brand] = await client.get<FeatureFlagPayload>(`${FLAGS_URL}?brand=${encodeURIComponent(brand)}`)
  fetchedAt[brand] = Date.now()
}

/**
 * Shared so that several reads in the same tick queue one request rather than
 * one each.
 */
function refresh(brand: Brand): Promise<void> {
  inFlight[brand] ??= load(brand).finally(() => {
    delete inFlight[brand]
  })

  return inFlight[brand]
}

/**
 * A read answers from what is already held and never waits. Refreshing here
 * rather than on a timer means nothing is fetched for a session that never asks
 * about a flag, and no interval is left running in a mobile app.
 */
function read(brand: Brand): FeatureFlagPayload {
  const stale = snapshots[brand] === undefined || Date.now() - (fetchedAt[brand] ?? 0) > REFRESH_AFTER_MS
  const mayRetry = Date.now() - (attemptedAt[brand] ?? 0) >= RETRY_AFTER_MS

  if (stale && mayRetry) {
    refresh(brand).catch(() => {})
  }

  return snapshots[brand] ?? {}
}

/**
 * What `reported` is keyed by: one evaluation of one flag, on one brand, under
 * one definition. Keyed by brand too, because the same key is a different
 * evaluation on another brand and the subject genuinely met both.
 */
function identityOf(report: Pick<ExposureReport, 'flag' | 'version' | 'brand'>): string {
  return `${report.brand}:${report.flag}:${report.version}`
}

/**
 * One request per brand. The server files a whole batch under the brand the
 * request names, so a batch that spanned brands would be filed under whichever
 * one it was sent with.
 *
 * `keepalive` lets the request outlive the page, which is the whole point when
 * this runs during teardown. It carries headers, unlike sendBeacon, and the
 * Authorization header is what ties the report to a user -- a beacon would
 * arrive unauthenticated and record nothing at all.
 */
function flushOnce(keepalive: boolean): void {
  const brand = pending[0].brand
  const batch: ExposureReport[] = []
  const rest: ExposureReport[] = []

  for (const report of pending) {
    if (report.brand === brand && batch.length < MAX_EXPOSURES_PER_REQUEST) {
      batch.push(report)
    } else {
      rest.push(report)
    }
  }

  pending = rest

  new HttpClient(globalConfig.baseUrl)
    .post(
      EXPOSURES_URL,
      { brand, exposures: batch.map(({ brand: _brand, ...report }) => report) },
      { keepalive }
    )
    .catch(() => {
      /*
       * Not retried here -- there is no queue and no timer -- but the batch is
       * let go of, so a later read of the same flag can send it again.
       *
       * Marking a flag reported before the request is what stops a render loop
       * queueing it fifty times. Leaving it marked after a failure is what made
       * a total failure indistinguishable from everything working: nothing is
       * sent, nothing is retried, and nothing says so. Relying on the subject
       * coming back in another session only works for subjects who come back,
       * which is not the population a landing-page experiment is measuring.
       *
       * Safe to re-send: the server keys an exposure on
       * (subject, flag, version) and ignores a duplicate, so first_seen_at
       * still describes the real first sighting.
       */
      batch.forEach((report) => reported.delete(identityOf(report)))
    })
}

function flush(): void {
  flushHandle = null

  if (pending.length === 0) {
    return
  }

  flushOnce(false)

  if (pending.length > 0) {
    schedule()
  }
}

/**
 * Sends everything still queued, now.
 *
 * The queue flushes on a short timer so that a page checking several flags
 * costs one request. Navigating away inside that window would otherwise take
 * the reports with it -- and the exposure most likely to be lost is the one for
 * whatever the subject just clicked through.
 */
function drain(): void {
  if (flushHandle !== null) {
    clearTimeout(flushHandle)
    flushHandle = null
  }

  while (pending.length > 0) {
    flushOnce(true)
  }
}

/**
 * Bound lazily, and only once something is actually queued, so a session that
 * never records an exposure leaves no listener behind.
 *
 * Web only, by feature detection. React Native has no document and does not
 * tear a page down the way a browser unloads one.
 *
 * The handler is held so that reset() can remove it. reset() runs on every
 * session change, so a flag kept here instead would either leave the listener
 * attached for a user who has signed out, or add a second one each time.
 */
function listenForTeardown(): void {
  if (teardownListener !== null || typeof document === 'undefined') {
    return
  }

  teardownListener = () => {
    if (document.visibilityState === 'hidden') {
      drain()
    }
  }

  document.addEventListener('visibilitychange', teardownListener)
}

function stopListeningForTeardown(): void {
  if (teardownListener !== null && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', teardownListener)
  }

  teardownListener = null
}

function schedule(): void {
  listenForTeardown()
  flushHandle ??= setTimeout(flush, FLUSH_DELAY_MS)
}

export const featureFlags = {
  /**
   * @param {string} flagKey
   * @param {string} brand
   * @returns {boolean}
   */
  accessible(flagKey: string, brand: Brand): boolean {
    const entry = read(brand)[flagKey]

    warnOnTypeMismatch(flagKey, entry, 'accessible', 'boolean')

    return entry?.value === true
  },

  /**
   * The fallback answers "no answer", not "the flag said no". A flag that is
   * off, archived, out of schedule or in a holdout is served as its own default
   * by the server; this is for a key that is not in the payload at all -- the
   * window before the first fetch lands, a failed fetch, a draft, an unknown
   * key, or a value that is not a string.
   *
   * @param {string} flagKey
   * @param {string} brand
   * @param {string} [fallback]
   * @returns {string}
   */
  variant(flagKey: string, brand: Brand, fallback: string = ''): string {
    const entry = read(brand)[flagKey]

    warnOnTypeMismatch(flagKey, entry, 'variant', 'string')

    return typeof entry?.value === 'string' ? entry.value : fallback
  },

  /**
   * @param {string} flagKey
   * @param {string} brand
   * @param {unknown} [fallback]
   * @returns {unknown}
   */
  value(flagKey: string, brand: Brand, fallback: unknown = null): unknown {
    const entry = read(brand)[flagKey]

    return entry === undefined ? fallback : entry.value
  },

  /**
   * @param {string} flagKey
   * @param {string} brand
   * @returns {void}
   * @example
   * featureFlags.recordExposure('new-checkout', 'drumeo')
   */
  recordExposure(flagKey: string, brand: Brand): void {
    const entry = read(brand)[flagKey]

    if (!entry || entry.variant === null || !RECORDABLE_REASONS.includes(entry.reason)) {
      return
    }

    const report: ExposureReport = {
      flag: flagKey,
      variant: entry.variant,
      // Echoed from what was served, never computed: it is what ties the record
      // to the definition this client evaluated under.
      version: entry.version,
      reason: entry.reason,
      brand,
    }

    if (reported.has(identityOf(report))) {
      return
    }

    reported.add(identityOf(report))
    pending.push(report)

    schedule()
  },

  /**
   * @param {string} brand
   * @returns {boolean}
   */
  isReady(brand: Brand): boolean {
    return snapshots[brand] !== undefined
  },

  /**
   * Forces a fetch, ignoring the retry floor a read obeys.
   *
   * @param {string} brand
   * @returns {Promise<void>}
   */
  refresh(brand: Brand): Promise<void> {
    return refresh(brand)
  },

  /**
   * @returns {void}
   */
  reset(): void {
    snapshots = {}
    fetchedAt = {}
    attemptedAt = {}
    inFlight = {}
    pending = []
    reported = new Set()
    warned = new Set()

    if (flushHandle !== null) {
      clearTimeout(flushHandle)
      flushHandle = null
    }

    stopListeningForTeardown()
  },
}
