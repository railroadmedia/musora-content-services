import { initializeTestService } from '../initializeTests.js'
import { featureFlags } from '../../src/services/feature-flags'
import type { Brand } from '../../src/lib/brands'

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

const BRAND = 'drumeo'

async function loadFlags(payload: Payload, brand: Brand = BRAND) {
  serve(payload)
  await featureFlags.refresh(brand)
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
      expect(featureFlags.accessible('on', BRAND)).toBe(true)
      expect(featureFlags.accessible('numeric', BRAND)).toBe(false)
      expect(featureFlags.accessible('stringy', BRAND)).toBe(false)
    })

    it('returns the fallback when a variant value is not a string', async () => {
      await loadFlags({
        copy: { variant: 'treatment', value: 'treatment', version: 1, reason: 'rollout' },
        flagged: { variant: 'on', value: true, version: 1, reason: 'rollout' },
      })

      expect(featureFlags.variant('copy', 'control', BRAND)).toBe('treatment')
      expect(featureFlags.variant('flagged', 'control', BRAND)).toBe('control')
    })

    it('hands back the raw value for number and json flags', async () => {
      await loadFlags({
        limit: { variant: 'high', value: 25, version: 1, reason: 'rollout' },
        config: { variant: 'a', value: { rows: 3 }, version: 1, reason: 'rollout' },
      })

      expect(featureFlags.value('limit', null, BRAND)).toBe(25)
      expect(featureFlags.value('config', null, BRAND)).toEqual({ rows: 3 })
      expect(featureFlags.value('missing', 'fallback', BRAND)).toBe('fallback')
    })

    it('treats an unknown flag the way the server does', async () => {
      await loadFlags({})

      expect(featureFlags.accessible('never-created', BRAND)).toBe(false)
      expect(featureFlags.variant('never-created', '', BRAND)).toBe('')
    })

    it('answers with defaults before anything has been fetched', () => {
      expect(featureFlags.isReady(BRAND)).toBe(false)
      expect(featureFlags.accessible('anything', BRAND)).toBe(false)
    })
  })

  describe('exposures', () => {
    const rolledOut: Payload = {
      'checkout-copy': {
        variant: 'treatment',
        value: 'treatment',
        version: 4,
        reason: 'rollout',
      },
    }

    it('records nothing merely for reading a flag', async () => {
      await loadFlags(rolledOut)

      featureFlags.accessible('checkout-copy', BRAND)
      featureFlags.variant('checkout-copy', '', BRAND)
      featureFlags.value('checkout-copy', null, BRAND)
      await settle()

      // The decision the whole design rests on: delivering a value is not an
      // encounter, and counting it would inflate every denominator.
      expect(requestsTo(EXPOSURES_URL)).toHaveLength(0)
    })

    it('reports the version it was served, not one it computed', async () => {
      await loadFlags(rolledOut)

      featureFlags.recordExposure('checkout-copy', BRAND)
      await settle()

      expect(bodyOf(requestsTo(EXPOSURES_URL)[0])).toEqual({
        brand: BRAND,
        exposures: [
          { flag: 'checkout-copy', variant: 'treatment', version: 4, reason: 'rollout' },
        ],
      })
    })

    it('sends exactly the fields the server validates, and no others', async () => {
      await loadFlags(rolledOut)

      featureFlags.recordExposure('checkout-copy', BRAND)
      await settle()

      // Asserted as a key set rather than with toEqual, which ignores a key
      // whose value is undefined. That is the exact shape a dropped payload
      // field takes, and it reaches the server as a missing required field.
      expect(Object.keys(bodyOf(requestsTo(EXPOSURES_URL)[0]).exposures[0]).sort()).toEqual([
        'flag',
        'reason',
        'variant',
        'version',
      ])
    })

    it('does not report a reason the server would discard', async () => {
      await loadFlags({
        served: { variant: 'off', value: false, version: 2, reason: 'default' },
        off: { variant: 'off', value: false, version: 2, reason: 'disabled' },
      })

      featureFlags.recordExposure('served', BRAND)
      featureFlags.recordExposure('off', BRAND)
      featureFlags.recordExposure('never-created', BRAND)
      await settle()

      expect(requestsTo(EXPOSURES_URL)).toHaveLength(0)
    })

    it('splits more than fifty exposures across requests', async () => {
      const many: Payload = {}
      for (let i = 0; i < 60; i += 1) {
        many[`flag-${i}`] = { variant: 'on', value: true, version: 1, reason: 'rollout' }
      }
      await loadFlags(many)

      Object.keys(many).forEach((key) => featureFlags.recordExposure(key, BRAND))
      await settle()
      await settle()

      const calls = requestsTo(EXPOSURES_URL)
      expect(calls).toHaveLength(2)
      expect(bodyOf(calls[0]).exposures).toHaveLength(50)
      expect(bodyOf(calls[1]).exposures).toHaveLength(10)
    })

    it('reports a flag once per version rather than once per call', async () => {
      await loadFlags(rolledOut)

      featureFlags.recordExposure('checkout-copy', BRAND)
      featureFlags.recordExposure('checkout-copy', BRAND)
      featureFlags.recordExposure('checkout-copy', BRAND)
      await settle()

      expect(bodyOf(requestsTo(EXPOSURES_URL)[0]).exposures).toHaveLength(1)
    })

    it('survives a failed report without throwing', async () => {
      await loadFlags(rolledOut)
      fetchMock.mockRejectedValueOnce(new Error('offline'))

      expect(() => featureFlags.recordExposure('checkout-copy', BRAND)).not.toThrow()
      await settle()
    })
  })

  describe('brands', () => {
    const payloads: Record<string, Payload> = {
      drumeo: { 'tour-banner': { variant: 'on', value: true, version: 3, reason: 'rule' } },
      pianote: { 'tour-banner': { variant: 'off', value: false, version: 3, reason: 'rule' } },
    }

    function serveByBrand() {
      fetchMock.mockImplementation((url: string) => {
        const brand = String(url).match(/brand=([a-z]+)/)?.[1] ?? 'drumeo'

        return Promise.resolve({
          ok: true,
          status: String(url).includes('exposures') ? 204 : 200,
          headers: { get: () => 'application/json' },
          json: async () => (String(url).includes('exposures') ? {} : payloads[brand]),
          text: async () => JSON.stringify(payloads[brand]),
        })
      })
    }

    it('asks for the brand it was given', async () => {
      await loadFlags({}, 'pianote')

      expect(String(requestsTo(FLAGS_URL)[0][0])).toContain('brand=pianote')
    })

    it('keeps one brand answer from being served for another', async () => {
      serveByBrand()
      await featureFlags.refresh('drumeo')
      await featureFlags.refresh('pianote')

      // Same key, same version, opposite answers: brand is a targeting
      // attribute, so a shared snapshot would hand one brand the other's.
      expect(featureFlags.accessible('tour-banner', 'drumeo')).toBe(true)
      expect(featureFlags.accessible('tour-banner', 'pianote')).toBe(false)
    })

    it('reports the same key on two brands as two exposures', async () => {
      serveByBrand()
      await featureFlags.refresh('drumeo')
      await featureFlags.refresh('pianote')

      featureFlags.recordExposure('tour-banner', 'drumeo')
      featureFlags.recordExposure('tour-banner', 'pianote')
      await settle()

      // One request per brand: the server files a whole batch under the brand
      // the request names, so a mixed batch would mislabel half of it.
      const posted = requestsTo(EXPOSURES_URL).map(bodyOf)
      expect(posted).toHaveLength(2)
      expect(posted.map((body) => body.brand).sort()).toEqual(['drumeo', 'pianote'])
      expect(posted.every((body) => body.exposures.length === 1)).toBe(true)
    })
  })

  describe('freshness', () => {
    it('answers immediately and refreshes behind the read once stale', async () => {
      await loadFlags({ ramp: { variant: 'off', value: false, version: 1, reason: 'rollout' } })
      expect(requestsTo(FLAGS_URL)).toHaveLength(1)

      featureFlags.accessible('ramp', BRAND)
      expect(requestsTo(FLAGS_URL)).toHaveLength(1)

      jest.advanceTimersByTime(61_000)
      serve({ ramp: { variant: 'on', value: true, version: 2, reason: 'rollout' } })

      // The stale read still answers from what is held, and kicks off the fetch.
      expect(featureFlags.accessible('ramp', BRAND)).toBe(false)

      // refresh() hands back the request that read already started, so this
      // waits on that one rather than guessing how many ticks it needs.
      await featureFlags.refresh(BRAND)

      expect(requestsTo(FLAGS_URL)).toHaveLength(2)
      expect(featureFlags.accessible('ramp', BRAND)).toBe(true)
    })

    it('collapses concurrent refreshes into one request', async () => {
      serve({})

      await Promise.all([featureFlags.refresh(BRAND), featureFlags.refresh(BRAND), featureFlags.refresh(BRAND)])

      expect(requestsTo(FLAGS_URL)).toHaveLength(1)
    })
  })

  describe('reset', () => {
    it('drops what was loaded so one user cannot read another user flags', async () => {
      await loadFlags({
        'new-checkout': { variant: 'on', value: true, version: 1, reason: 'rollout' },
      })
      expect(featureFlags.accessible('new-checkout', BRAND)).toBe(true)

      featureFlags.reset()

      expect(featureFlags.isReady(BRAND)).toBe(false)
      expect(featureFlags.accessible('new-checkout', BRAND)).toBe(false)
    })
  })
})
