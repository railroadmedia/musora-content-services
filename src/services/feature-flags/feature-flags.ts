/**
 * @module FeatureFlags
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
import type { Brand } from '../../lib/brands'
import { globalConfig } from '../config'
import type { EvaluationReason, ExposureReport, FeatureFlagPayload } from './types'

const FLAGS_URL = '/api/feature/v1/flags'
const EXPOSURES_URL = '/api/feature/v1/exposures'

const REFRESH_AFTER_MS = 60_000
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
let inFlight: Record<string, Promise<void>> = {}

let pending: ExposureReport[] = []
let reported = new Set<string>()
let flushHandle: ReturnType<typeof setTimeout> | null = null

async function load(brand: Brand): Promise<void> {
  const client = new HttpClient(globalConfig.baseUrl)

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
  if (snapshots[brand] === undefined || Date.now() - (fetchedAt[brand] ?? 0) > REFRESH_AFTER_MS) {
    refresh(brand).catch(() => {})
  }

  return snapshots[brand] ?? {}
}

/**
 * One request per brand. The server files a whole batch under the brand the
 * request names, so a batch that spanned brands would be filed under whichever
 * one it was sent with.
 */
function flush(): void {
  flushHandle = null

  if (pending.length === 0) {
    return
  }

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
    .post(EXPOSURES_URL, {
      brand,
      exposures: batch.map(({ brand: _brand, ...report }) => report),
    })
    .catch(() => {
      /*
       * Dropped rather than retried. The server keys an exposure on
       * (subject, flag, version) and ignores a duplicate, so the next
       * session that reads this flag reports it again at no cost, and the
       * recorded first_seen_at still describes the real first sighting.
       */
    })

  if (pending.length > 0) {
    schedule()
  }
}

function schedule(): void {
  flushHandle ??= setTimeout(flush, FLUSH_DELAY_MS)
}

export const featureFlags = {
  /**
   * @param {string} flagKey
   * @param {string} brand
   * @returns {boolean}
   */
  accessible(flagKey: string, brand: Brand): boolean {
    return read(brand)[flagKey]?.value === true
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
    const value = read(brand)[flagKey]?.value

    return typeof value === 'string' ? value : fallback
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

    // Keyed by brand as well, because the same key is a different evaluation on
    // another brand and the subject genuinely met both.
    const identity = `${brand}:${flagKey}:${entry.version}`

    if (reported.has(identity)) {
      return
    }

    reported.add(identity)
    pending.push({
      flag: flagKey,
      variant: entry.variant,
      // Echoed from what was served, never computed: it is what ties the record
      // to the definition this client evaluated under.
      version: entry.version,
      reason: entry.reason,
      brand,
    })

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
    inFlight = {}
    pending = []
    reported = new Set()

    if (flushHandle !== null) {
      clearTimeout(flushHandle)
      flushHandle = null
    }
  },
}
