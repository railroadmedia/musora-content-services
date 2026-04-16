import SyncRetry from '@/services/sync/retry'
import type SyncContext from '@/services/sync/context/index'
import type { SyncTelemetry } from '@/services/sync/telemetry/index'

// Subclass exposes sleep as a spy — no `as any` access to private internals
class TestableSyncRetry extends SyncRetry {
  readonly sleepSpy = jest.fn().mockResolvedValue(undefined)
  protected override sleep(ms: number) {
    return this.sleepSpy(ms)
  }
}

// ---

function makeRetry(online = true) {
  let connectivityListener: ((v: boolean) => void) | null = null

  const connectivity = {
    getValue: jest.fn().mockReturnValue(online),
    subscribe: jest.fn().mockImplementation((listener: (v: boolean) => void) => {
      connectivityListener = listener
      return () => { connectivityListener = null }
    }),
  }
  const context = { connectivity } as unknown as SyncContext
  const telemetry = { debug: jest.fn() } as unknown as SyncTelemetry
  const retry = new TestableSyncRetry(context, telemetry)

  const triggerConnectivity = (isOnline: boolean) => {
    connectivity.getValue.mockReturnValue(isOnline)
    connectivityListener?.(isOnline)
  }

  return { retry, connectivity, telemetry, triggerConnectivity }
}

const ok = { ok: true as const, results: [] }
const retryable = { ok: false as const, failureType: 'fetch' as const, isRetryable: true }
const nonRetryable = { ok: false as const, failureType: 'fetch' as const, isRetryable: false }

// ---

describe('successful request', () => {
  test('returns result on first attempt', async () => {
    const { retry } = makeRetry()
    const result = await retry.request(jest.fn().mockResolvedValue(ok))

    expect(result).toEqual(ok)
  })

  test('syncFn called exactly once', async () => {
    const { retry } = makeRetry()
    const syncFn = jest.fn().mockResolvedValue(ok)

    await retry.request(syncFn)

    expect(syncFn).toHaveBeenCalledTimes(1)
  })

  test('does not sleep on first attempt', async () => {
    const { retry } = makeRetry()
    await retry.request(jest.fn().mockResolvedValue(ok))

    expect(retry.sleepSpy).not.toHaveBeenCalled()
  })

  test('passes attempt number 1 to syncFn', async () => {
    const { retry } = makeRetry()
    const syncFn = jest.fn().mockResolvedValue(ok)

    await retry.request(syncFn)

    expect(syncFn).toHaveBeenCalledWith(1)
  })
})

// ---

describe('no connectivity', () => {
  test('returns fetch failure without calling syncFn', async () => {
    const { retry } = makeRetry(false)
    const syncFn = jest.fn()

    const result = await retry.request(syncFn)

    expect(result.ok).toBe(false)
    expect(syncFn).not.toHaveBeenCalled()
  })

  test('returned failure is non-retryable', async () => {
    const { retry } = makeRetry(false)
    const result = await retry.request(jest.fn()) as typeof nonRetryable

    expect(result.isRetryable).toBe(false)
    expect(result.failureType).toBe('fetch')
  })
})

// ---

describe('non-retryable failure', () => {
  test('returns after single attempt', async () => {
    const { retry } = makeRetry()
    const syncFn = jest.fn().mockResolvedValue(nonRetryable)

    const result = await retry.request(syncFn)

    expect(result).toEqual(nonRetryable)
    expect(syncFn).toHaveBeenCalledTimes(1)
  })

  test('does not call onFail', async () => {
    const { retry } = makeRetry()
    const onFail = jest.fn()

    await retry.request(jest.fn().mockResolvedValue(nonRetryable), { onFail })

    expect(onFail).not.toHaveBeenCalled()
  })

  test('does not sleep', async () => {
    const { retry } = makeRetry()
    await retry.request(jest.fn().mockResolvedValue(nonRetryable))

    expect(retry.sleepSpy).not.toHaveBeenCalled()
  })
})

// ---

describe('retryable failures', () => {
  test(`retries up to MAX_ATTEMPTS (${SyncRetry.MAX_ATTEMPTS}) times`, async () => {
    const { retry } = makeRetry()
    const syncFn = jest.fn().mockResolvedValue(retryable)

    await retry.request(syncFn)

    expect(syncFn).toHaveBeenCalledTimes(SyncRetry.MAX_ATTEMPTS)
  })

  test('calls onFail when attempts exhausted', async () => {
    const { retry } = makeRetry()
    const onFail = jest.fn()

    await retry.request(jest.fn().mockResolvedValue(retryable), { onFail })

    expect(onFail).toHaveBeenCalledTimes(1)
  })

  test('returns last failure result after exhausting attempts', async () => {
    const { retry } = makeRetry()
    const result = await retry.request(jest.fn().mockResolvedValue(retryable))

    expect(result).toEqual(retryable)
  })

  test('passes incrementing attempt numbers to syncFn', async () => {
    const { retry } = makeRetry()
    const syncFn = jest.fn().mockResolvedValue(retryable)

    await retry.request(syncFn)

    Array.from({ length: SyncRetry.MAX_ATTEMPTS }, (_, i) => i + 1).forEach((n, i) => {
      expect(syncFn).toHaveBeenNthCalledWith(i + 1, n)
    })
  })

  test('succeeds after initial failures', async () => {
    const { retry } = makeRetry()
    const syncFn = jest.fn()
      .mockResolvedValueOnce(retryable)
      .mockResolvedValueOnce(retryable)
      .mockResolvedValue(ok)

    const result = await retry.request(syncFn)

    expect(result).toEqual(ok)
    expect(syncFn).toHaveBeenCalledTimes(3)
  })

  test('does not call onFail when success before MAX_ATTEMPTS', async () => {
    const { retry } = makeRetry()
    const onFail = jest.fn()
    const syncFn = jest.fn()
      .mockResolvedValueOnce(retryable)
      .mockResolvedValue(ok)

    await retry.request(syncFn, { onFail })

    expect(onFail).not.toHaveBeenCalled()
  })
})

// ---

describe('backoff', () => {
  test('sleep called between retries (once before each retry attempt)', async () => {
    const { retry } = makeRetry()
    await retry.request(jest.fn().mockResolvedValue(retryable))

    expect(retry.sleepSpy).toHaveBeenCalledTimes(SyncRetry.MAX_ATTEMPTS - 1)
  })

  test('sleep called with positive ms', async () => {
    const { retry } = makeRetry()
    await retry.request(jest.fn().mockResolvedValue(retryable))

    retry.sleepSpy.mock.calls.forEach(([ms]) => {
      expect(ms).toBeGreaterThan(0)
    })
  })

  test(`sleep duration does not exceed MAX_BACKOFF (${SyncRetry.MAX_BACKOFF}ms)`, async () => {
    const { retry } = makeRetry()
    await retry.request(jest.fn().mockResolvedValue(retryable))

    retry.sleepSpy.mock.calls.forEach(([ms]) => {
      expect(ms).toBeLessThanOrEqual(SyncRetry.MAX_BACKOFF)
    })
  })

  test('backoff resets after success — no sleep on subsequent clean request', async () => {
    const { retry } = makeRetry()

    const syncFn = jest.fn()
      .mockResolvedValueOnce(retryable)
      .mockResolvedValue(ok)
    await retry.request(syncFn)

    retry.sleepSpy.mockClear()

    await retry.request(jest.fn().mockResolvedValue(ok))
    expect(retry.sleepSpy).not.toHaveBeenCalled()
  })
})

// ---

describe('edge cases', () => {
  test('connectivity goes offline mid-retry — returns no-connectivity response', async () => {
    const { retry, connectivity } = makeRetry(true)

    // Online for attempt 1, offline for attempt 2
    connectivity.getValue
      .mockReturnValueOnce(true)
      .mockReturnValue(false)

    const syncFn = jest.fn().mockResolvedValue(retryable)
    const result = await retry.request(syncFn) as typeof nonRetryable

    expect(syncFn).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(false)
    expect(result.isRetryable).toBe(false)
  })

  test('syncFn throwing propagates the error', async () => {
    const { retry } = makeRetry()
    const boom = new Error('network exploded')

    await expect(
      retry.request(jest.fn().mockRejectedValue(boom))
    ).rejects.toThrow('network exploded')
  })

  test('null result returned immediately without retry', async () => {
    const { retry } = makeRetry()
    const syncFn = jest.fn().mockResolvedValue(null)

    const result = await retry.request(syncFn)

    expect(result).toBeNull()
    expect(syncFn).toHaveBeenCalledTimes(1)
  })

  test('concurrent requests share backoff state', async () => {
    const { retry } = makeRetry()

    // Two concurrent requests both hitting retryable failures
    const [r1, r2] = await Promise.all([
      retry.request(jest.fn().mockResolvedValue(retryable)),
      retry.request(jest.fn().mockResolvedValue(retryable)),
    ])

    expect(r1.ok).toBe(false)
    expect(r2.ok).toBe(false)
  })
})

// ---

describe('start / stop', () => {
  test('start subscribes to connectivity', () => {
    const { retry, connectivity } = makeRetry()
    retry.start()

    expect(connectivity.subscribe).toHaveBeenCalledTimes(1)
  })

  test('stop unsubscribes from connectivity', () => {
    const { retry, connectivity } = makeRetry()
    const unsub = jest.fn()
    connectivity.subscribe.mockReturnValue(unsub)

    retry.start()
    retry.stop()

    expect(unsub).toHaveBeenCalledTimes(1)
  })

  test('stop is safe to call before start', () => {
    const { retry } = makeRetry()
    expect(() => retry.stop()).not.toThrow()
  })
})
