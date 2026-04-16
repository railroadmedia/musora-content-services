import { createThrottleState, dropThrottle, queueThrottle } from '../../../../src/services/sync/utils/throttle'

// ---

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

// ---

describe('createThrottleState', () => {
  test('initialises with correct defaults', () => {
    const state = createThrottleState(1000)

    expect(state.minIntervalMs).toBe(1000)
    expect(state.isWaiting).toBe(false)
    expect(state.current).toBeNull()
    expect(state.next).toBeNull()
    expect(state.lastCallTime).toBe(0)
  })
})

// ---

describe('dropThrottle', () => {
  test('calls fn immediately on first invocation', async () => {
    const fn = jest.fn().mockResolvedValue('result')
    const state = createThrottleState(1000)
    const throttled = dropThrottle({ state }, fn)

    const p = throttled()
    jest.runAllTimers()
    await p

    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('returns same promise for concurrent calls', async () => {
    const fn = jest.fn().mockResolvedValue('result')
    const state = createThrottleState(1000)
    const throttled = dropThrottle({ state }, fn)

    const p1 = throttled()
    const p2 = throttled()

    expect(p1).toBe(p2)

    await jest.runAllTimersAsync()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('drops second call when one is already in-flight', async () => {
    const fn = jest.fn().mockResolvedValue('result')
    const state = createThrottleState(0)
    const throttled = dropThrottle({ state }, fn)

    const p1 = throttled()
    jest.runAllTimers()
    await p1

    const p2 = throttled()
    jest.runAllTimers()
    await p2

    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('waits minIntervalMs before next call', async () => {
    const fn = jest.fn().mockResolvedValue('ok')
    const state = createThrottleState(500)
    const throttled = dropThrottle({ state }, fn)

    const p1 = throttled()
    jest.runAllTimers()
    await p1

    // Second call — interval not elapsed yet, so wait is triggered
    const p2 = throttled()
    expect(fn).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(500)
    await p2

    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('deferOnce queues next call while current is running', async () => {
    let resolveFirst!: () => void
    const firstPromise = new Promise<string>(res => { resolveFirst = () => res('first') })
    const fn = jest.fn()
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValue('second')

    const state = createThrottleState(0)
    const throttled = dropThrottle({ state, deferOnce: true }, fn)

    throttled() // first call — starts wait phase

    await jest.runAllTimersAsync() // flush wait → fn is now called and in-flight, isWaiting = false
    expect(fn).toHaveBeenCalledTimes(1)

    throttled() // second call — deferOnce queues it now that isWaiting is false

    resolveFirst()
    await jest.runAllTimersAsync()

    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('deferOnce does not queue when already waiting', () => {
    const fn = jest.fn().mockResolvedValue('ok')
    const state = createThrottleState(1000)
    const throttled = dropThrottle({ state, deferOnce: true }, fn)

    throttled() // starts wait, sets isWaiting = true
    throttled() // isWaiting is true — does not queue
    throttled() // isWaiting is true — does not queue

    expect(state.next).toBeNull()
    expect(fn).toHaveBeenCalledTimes(0) // still waiting
  })

  test('sets lastCallTime after execution', async () => {
    const fn = jest.fn().mockResolvedValue('ok')
    const state = createThrottleState(0)
    const throttled = dropThrottle({ state }, fn)

    const before = Date.now()
    const p = throttled()
    jest.runAllTimers()
    await p

    expect(state.lastCallTime).toBeGreaterThanOrEqual(before)
  })
})

// ---

describe('queueThrottle', () => {
  test('calls fn immediately on first invocation', async () => {
    const fn = jest.fn().mockResolvedValue('result')
    const state = createThrottleState(0)
    const throttled = queueThrottle({ state }, fn)

    const p = throttled()
    jest.runAllTimers()
    await p

    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('queues second call while first is in-flight', async () => {
    let resolveFirst!: () => void
    const firstDone = new Promise<string>(res => { resolveFirst = () => res('first') })
    const fn = jest.fn()
      .mockReturnValueOnce(firstDone)
      .mockResolvedValue('second')

    const state = createThrottleState(0)
    const throttled = queueThrottle({ state }, fn)

    throttled() // first — in-flight
    throttled() // second — queued

    expect(fn).toHaveBeenCalledTimes(1)

    resolveFirst()
    await jest.runAllTimersAsync()

    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('second call overwrites queued next (only one queued at a time)', async () => {
    let resolveFirst!: () => void
    const firstDone = new Promise<string>(res => { resolveFirst = () => res('first') })
    const fn = jest.fn()
      .mockReturnValueOnce(firstDone)
      .mockResolvedValue('later')

    const state = createThrottleState(0)
    const throttled = queueThrottle({ state }, fn)

    throttled()
    throttled() // queued as next
    throttled() // overwrites next

    expect(fn).toHaveBeenCalledTimes(1)
    expect(state.next).not.toBeNull()

    resolveFirst()
    await jest.runAllTimersAsync()

    // Only one more call (the last queued), not two
    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('returns current promise for concurrent calls', () => {
    const fn = jest.fn().mockResolvedValue('ok')
    const state = createThrottleState(0)
    const throttled = queueThrottle({ state }, fn)

    const p1 = throttled()
    const p2 = throttled()

    expect(p1).toBe(p2)
  })

  test('respects minIntervalMs between calls', async () => {
    const fn = jest.fn().mockResolvedValue('ok')
    const state = createThrottleState(500)
    const throttled = queueThrottle({ state }, fn)

    const p1 = throttled()
    jest.runAllTimers()
    await p1

    const before = Date.now()
    jest.advanceTimersByTime(100) // only 100ms since last call

    const p2 = throttled()
    expect(fn).toHaveBeenCalledTimes(1) // not called yet — waiting for interval

    jest.advanceTimersByTime(400) // now 500ms elapsed
    await p2

    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('clears current after completion', async () => {
    const fn = jest.fn().mockResolvedValue('ok')
    const state = createThrottleState(0)
    const throttled = queueThrottle({ state }, fn)

    const p = throttled()
    jest.runAllTimers()
    await p

    expect(state.current).toBeNull()
  })
})
