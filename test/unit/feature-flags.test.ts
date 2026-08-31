import { initializeTestService } from '../initializeTests.js'
import { featureFlags } from '../../src/services/feature-flags'

const FLAGS_URL = '/api/feature/v1/flags'
const EXPOSURES_URL = '/api/feature/v1/exposures'

type Payload = Record<
  string,
  { variant: string | null; value: unknown; version: number; reason: string }
>

let fetchMock: jest.Mock

function serve(payload: Payload) {
  fetchMock.mockImplementation((url: string) =>
    Promise.resolve({
      ok: true,
      status: url.includes('exposures') ? 204 : 200,
      headers: { get: () => 'application/json' },
      json: async () => (url.includes('exposures') ? {} : payload),
      text: async () => JSON.stringify(url.includes('exposures') ? {} : payload),
    })
  )
}

function requestsTo(url: string) {
  return fetchMock.mock.calls.filter((call) => String(call[0]).includes(url))
}

function bodyOf(call: any[]) {
  return JSON.parse(call[1].body)
}

async function loadFlags(payload: Payload) {
  serve(payload)
  await featureFlags.refresh()
}

/** The queue flushes on a timer, so tests wait for it rather than assert into a gap. */
async function settle() {
  jest.advanceTimersByTime(100)
  await Promise.resolve()
  await Promise.resolve()
}

describe('featureFlags', () => {
  beforeEach(() => {
    initializeTestService()
    featureFlags.reset()
    jest.useFakeTimers()
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  describe('reading', () => {
    it('is accessible only when the value is exactly true', async () => {
      await loadFlags({
        on: { variant: 'on', value: true, version: 1, reason: 'rollout' },
        numeric: { variant: 'on', value: 1, version: 1, reason: 'rollout' },
        stringy: { variant: 'on', value: 'true', version: 1, reason: 'rollout' },
      })

      // Matches Evaluation::bool() on the server, which is a strict === true.
      expect(featureFlags.accessible('on')).toBe(true)
      expect(featureFlags.accessible('numeric')).toBe(false)
      expect(featureFlags.accessible('stringy')).toBe(false)
    })

    it('returns the fallback when a variant value is not a string', async () => {
      await loadFlags({
        copy: { variant: 'treatment', value: 'treatment', version: 1, reason: 'rollout' },
        flagged: { variant: 'on', value: true, version: 1, reason: 'rollout' },
      })

      expect(featureFlags.variant('copy', 'control')).toBe('treatment')
      expect(featureFlags.variant('flagged', 'control')).toBe('control')
    })

    it('hands back the raw value for number and json flags', async () => {
      await loadFlags({
        limit: { variant: 'high', value: 25, version: 1, reason: 'rollout' },
        config: { variant: 'a', value: { rows: 3 }, version: 1, reason: 'rollout' },
      })

      expect(featureFlags.value('limit')).toBe(25)
      expect(featureFlags.value('config')).toEqual({ rows: 3 })
      expect(featureFlags.value('missing', 'fallback')).toBe('fallback')
    })

    it('treats an unknown flag the way the server does', async () => {
      await loadFlags({})

      expect(featureFlags.accessible('never-created')).toBe(false)
      expect(featureFlags.variant('never-created')).toBe('')
    })

    it('answers with defaults before anything has been fetched', () => {
      expect(featureFlags.isReady()).toBe(false)
      expect(featureFlags.accessible('anything')).toBe(false)
    })
  })

  describe('exposures', () => {
    const rolledOut: Payload = {
      'checkout-copy': { variant: 'treatment', value: 'treatment', version: 4, reason: 'rollout' },
    }

    it('records nothing merely for reading a flag', async () => {
      await loadFlags(rolledOut)

      featureFlags.accessible('checkout-copy')
      featureFlags.variant('checkout-copy')
      featureFlags.value('checkout-copy')
      await settle()

      // The decision the whole design rests on: delivering a value is not an
      // encounter, and counting it would inflate every denominator.
      expect(requestsTo(EXPOSURES_URL)).toHaveLength(0)
    })

    it('reports the version it was served, not one it computed', async () => {
      await loadFlags(rolledOut)

      featureFlags.recordExposure('checkout-copy')
      await settle()

      expect(bodyOf(requestsTo(EXPOSURES_URL)[0])).toEqual({
        exposures: [{ flag: 'checkout-copy', variant: 'treatment', version: 4, reason: 'rollout' }],
      })
    })

    it('does not report a reason the server would discard', async () => {
      await loadFlags({
        served: { variant: 'off', value: false, version: 2, reason: 'default' },
        off: { variant: 'off', value: false, version: 2, reason: 'disabled' },
      })

      featureFlags.recordExposure('served')
      featureFlags.recordExposure('off')
      featureFlags.recordExposure('never-created')
      await settle()

      expect(requestsTo(EXPOSURES_URL)).toHaveLength(0)
    })

    it('splits more than fifty exposures across requests', async () => {
      const many: Payload = {}
      for (let i = 0; i < 60; i += 1) {
        many[`flag-${i}`] = { variant: 'on', value: true, version: 1, reason: 'rollout' }
      }
      await loadFlags(many)

      Object.keys(many).forEach((key) => featureFlags.recordExposure(key))
      await settle()
      await settle()

      const calls = requestsTo(EXPOSURES_URL)
      expect(calls).toHaveLength(2)
      expect(bodyOf(calls[0]).exposures).toHaveLength(50)
      expect(bodyOf(calls[1]).exposures).toHaveLength(10)
    })

    it('reports a flag once per version rather than once per call', async () => {
      await loadFlags(rolledOut)

      featureFlags.recordExposure('checkout-copy')
      featureFlags.recordExposure('checkout-copy')
      featureFlags.recordExposure('checkout-copy')
      await settle()

      expect(bodyOf(requestsTo(EXPOSURES_URL)[0]).exposures).toHaveLength(1)
    })

    it('survives a failed report without throwing', async () => {
      await loadFlags(rolledOut)
      fetchMock.mockRejectedValueOnce(new Error('offline'))

      expect(() => featureFlags.recordExposure('checkout-copy')).not.toThrow()
      await settle()
    })
  })

  describe('freshness', () => {
    it('answers immediately and refreshes behind the read once stale', async () => {
      await loadFlags({ ramp: { variant: 'off', value: false, version: 1, reason: 'rollout' } })
      expect(requestsTo(FLAGS_URL)).toHaveLength(1)

      featureFlags.accessible('ramp')
      expect(requestsTo(FLAGS_URL)).toHaveLength(1)

      jest.advanceTimersByTime(61_000)
      serve({ ramp: { variant: 'on', value: true, version: 2, reason: 'rollout' } })

      // The stale read still answers from what is held, and kicks off the fetch.
      expect(featureFlags.accessible('ramp')).toBe(false)

      // refresh() hands back the request that read already started, so this
      // waits on that one rather than guessing how many ticks it needs.
      await featureFlags.refresh()

      expect(requestsTo(FLAGS_URL)).toHaveLength(2)
      expect(featureFlags.accessible('ramp')).toBe(true)
    })

    it('collapses concurrent refreshes into one request', async () => {
      serve({})

      await Promise.all([featureFlags.refresh(), featureFlags.refresh(), featureFlags.refresh()])

      expect(requestsTo(FLAGS_URL)).toHaveLength(1)
    })
  })

  describe('reset', () => {
    it('drops what was loaded so one user cannot read another user flags', async () => {
      await loadFlags({
        'new-checkout': { variant: 'on', value: true, version: 1, reason: 'rollout' },
      })
      expect(featureFlags.accessible('new-checkout')).toBe(true)

      featureFlags.reset()

      expect(featureFlags.isReady()).toBe(false)
      expect(featureFlags.accessible('new-checkout')).toBe(false)
    })
  })
})
