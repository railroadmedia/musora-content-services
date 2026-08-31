/**
 * @module FeatureFlags
 */
import { HttpClient } from '../../infrastructure/http/HttpClient'
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

let snapshot: FeatureFlagPayload | null = null
let fetchedAt = 0
let inFlight: Promise<void> | null = null

let pending: ExposureReport[] = []
let reported = new Set<string>()
let flushHandle: ReturnType<typeof setTimeout> | null = null

async function load(): Promise<void> {
  const client = new HttpClient(globalConfig.baseUrl)

  snapshot = await client.get<FeatureFlagPayload>(FLAGS_URL)
  fetchedAt = Date.now()
}

/**
 * Shared so that several reads in the same tick queue one request rather than
 * one each.
 */
function refresh(): Promise<void> {
  inFlight ??= load().finally(() => {
    inFlight = null
  })

  return inFlight
}

/**
 * A read answers from what is already held and never waits. Refreshing here
 * rather than on a timer means nothing is fetched for a session that never asks
 * about a flag, and no interval is left running in a mobile app.
 */
function read(): FeatureFlagPayload {
  if (snapshot === null || Date.now() - fetchedAt > REFRESH_AFTER_MS) {
    refresh().catch(() => {})
  }

  return snapshot ?? {}
}

function flush(): void {
  flushHandle = null

  const batch = pending.slice(0, MAX_EXPOSURES_PER_REQUEST)
  pending = pending.slice(MAX_EXPOSURES_PER_REQUEST)

  if (batch.length === 0) {
    return
  }

  new HttpClient(globalConfig.baseUrl).post(EXPOSURES_URL, { exposures: batch }).catch(() => {
    /*
     * Dropped rather than retried. The server keys an exposure on
     * (user, flag, brand, version) and ignores a duplicate, so the next
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
   * @returns {boolean}
   */
  accessible(flagKey: string): boolean {
    return read()[flagKey]?.value === true
  },

  /**
   * @param {string} flagKey
   * @param {string} [fallback]
   * @returns {string}
   */
  variant(flagKey: string, fallback = ''): string {
    const value = read()[flagKey]?.value

    return typeof value === 'string' ? value : fallback
  },

  /**
   * @param {string} flagKey
   * @param {unknown} [fallback]
   * @returns {unknown}
   */
  value(flagKey: string, fallback: unknown = null): unknown {
    const entry = read()[flagKey]

    return entry === undefined ? fallback : entry.value
  },

  /**
   * @param {string} flagKey
   * @returns {void}
   * @example
   * featureFlags.recordExposure('new-checkout')
   */
  recordExposure(flagKey: string): void {
    const entry = read()[flagKey]

    if (!entry || entry.variant === null || !RECORDABLE_REASONS.includes(entry.reason)) {
      return
    }

    const identity = `${flagKey}:${entry.version}`

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
    })

    schedule()
  },

  /**
   * @returns {boolean}
   */
  isReady(): boolean {
    return snapshot !== null
  },

  /**
   * @returns {Promise<void>}
   */
  refresh(): Promise<void> {
    return refresh()
  },

  /**
   * @returns {void}
   */
  reset(): void {
    snapshot = null
    fetchedAt = 0
    inFlight = null
    pending = []
    reported = new Set()

    if (flushHandle !== null) {
      clearTimeout(flushHandle)
      flushHandle = null
    }
  },
}
