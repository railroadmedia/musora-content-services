export interface ThrottleState<T> {
  isWaiting: boolean
  current: Promise<T> | null;
  next: (() => Promise<T>) | null;
  lastCallTime: number;
  minIntervalMs: number;
}

export function createThrottleState<T>(minIntervalMs: number): ThrottleState<T> {
  return {
    isWaiting: false,
    current: null,
    next: null,
    lastCallTime: 0,
    minIntervalMs
  };
}

export function dropThrottle<T>(
  options: { state: ThrottleState<T>, deferOnce?: boolean },
  fn: (..._args: any[]) => Promise<T>
) {
  return (...args: any[]) => {
    const { state } = options

    const wait = () => {
      return new Promise<void>(resolve => {
        state.isWaiting = true
        const t = Date.now() - state.lastCallTime
        if (t < state.minIntervalMs) {
          setTimeout(resolve, state.minIntervalMs - t)
        } else {
          resolve()
        }
      }).finally(() => {
        state.isWaiting = false
      })
    }

    const run = (fn: (..._args: any[]) => Promise<T>, args: any[]) => {
      state.lastCallTime = Date.now()
      return fn(...args).finally(() => {
        if (state.next) {
          const n = state.next()
          state.next = null
          state.current = n
        } else {
          state.current = null
        }
      })
    }

    if (!state.current) {
      state.current = wait().then(() => run(fn, args))
    } else if (options.deferOnce && !state.isWaiting) {
      state.next = () => run(fn, args)
    }

    return state.current
  }
}

export function queueThrottle<T>(
  options: { state: ThrottleState<T>, deferOnce?: boolean },
  fn: (..._args: any[]) => Promise<T>
) {
  return (...args: any[]) => {
    const { state } = options

    const run = async () => {
      const elapsed = Date.now() - state.lastCallTime
      if (elapsed < state.minIntervalMs) {
        await new Promise<void>(r => setTimeout(r, state.minIntervalMs - elapsed))
      }

      state.lastCallTime = Date.now()
      return fn(...args).finally(() => {
        const next = state.next
        state.next = null
        state.current = next ? next() : null
      })
    }

    if (!state.current) {
      state.current = run()
    } else {
      state.next = () => run()
    }

    return state.current
  }

}
