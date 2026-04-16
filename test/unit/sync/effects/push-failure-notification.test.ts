import createPushFailureNotificationEffect from '@/services/sync/effects/push-failure-notification'
import type SyncStore from '@/services/sync/store/index'
import { makeContext } from '../helpers/index'

const COOLDOWN_MS = 60_000 * 10
const MUTE_MS = 60_000 * 60 * 3

// ---

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

// ---

function makeMockStore() {
  const listeners = new Map<string, (() => void)[]>()

  const store = {
    on: jest.fn().mockImplementation((event: string, handler: () => void) => {
      const list = listeners.get(event) ?? []
      list.push(handler)
      listeners.set(event, list)
      return () => {
        const idx = list.indexOf(handler)
        if (idx >= 0) list.splice(idx, 1)
      }
    }),
  } as unknown as SyncStore

  const emit = (event: string) => listeners.get(event)?.forEach(h => h())

  return { store, emit }
}

function makeEffect(notify = jest.fn()) {
  const effect = createPushFailureNotificationEffect(notify)
  return { effect, notify }
}

// ---

describe('notification triggering', () => {
  test('notifyCallback called when failedPush fires', () => {
    const { store, emit } = makeMockStore()
    const { effect, notify } = makeEffect()

    effect(makeContext(), [store])
    emit('failedPush')

    expect(notify).toHaveBeenCalledTimes(1)
  })

  test('notifyCallback called with mute function', () => {
    const { store, emit } = makeMockStore()
    const { effect, notify } = makeEffect()

    effect(makeContext(), [store])
    emit('failedPush')

    expect(notify.mock.calls[0][0]).toHaveProperty('mute')
    expect(typeof notify.mock.calls[0][0].mute).toBe('function')
  })

  test('failedPush on any store triggers notification', () => {
    const s1 = makeMockStore()
    const s2 = makeMockStore()
    const { effect, notify } = makeEffect()

    effect(makeContext(), [s1.store, s2.store])

    s2.emit('failedPush')

    expect(notify).toHaveBeenCalledTimes(1)
  })
})

// ---

describe('cooldown', () => {
  test('second failedPush within cooldown does not notify again', () => {
    const { store, emit } = makeMockStore()
    const { effect, notify } = makeEffect()

    effect(makeContext(), [store])
    emit('failedPush')
    emit('failedPush')

    expect(notify).toHaveBeenCalledTimes(1)
  })

  test('notifies again after cooldown expires', () => {
    const { store, emit } = makeMockStore()
    const { effect, notify } = makeEffect()

    effect(makeContext(), [store])
    emit('failedPush')

    jest.advanceTimersByTime(COOLDOWN_MS)
    emit('failedPush')

    expect(notify).toHaveBeenCalledTimes(2)
  })

  test('does not notify just before cooldown expires', () => {
    const { store, emit } = makeMockStore()
    const { effect, notify } = makeEffect()

    effect(makeContext(), [store])
    emit('failedPush')

    jest.advanceTimersByTime(COOLDOWN_MS - 1)
    emit('failedPush')

    expect(notify).toHaveBeenCalledTimes(1)
  })
})

// ---

describe('mute', () => {
  test('mute() prevents further notifications', () => {
    const { store, emit } = makeMockStore()
    const { effect, notify } = makeEffect()

    effect(makeContext(), [store])
    emit('failedPush')

    const { mute } = notify.mock.calls[0][0]
    mute()

    jest.advanceTimersByTime(COOLDOWN_MS)
    emit('failedPush')

    expect(notify).toHaveBeenCalledTimes(1)
  })

  test('notifications resume after mute period expires', () => {
    const { store, emit } = makeMockStore()
    const { effect, notify } = makeEffect()

    effect(makeContext(), [store])
    emit('failedPush')

    const { mute } = notify.mock.calls[0][0]
    mute()

    jest.advanceTimersByTime(MUTE_MS + COOLDOWN_MS)
    emit('failedPush')

    expect(notify).toHaveBeenCalledTimes(2)
  })

  test('mute does not suppress notification already in progress', () => {
    const { store, emit } = makeMockStore()
    const { effect, notify } = makeEffect()

    effect(makeContext(), [store])
    emit('failedPush')

    expect(notify).toHaveBeenCalledTimes(1)
  })
})

// ---

describe('teardown', () => {
  test('teardown prevents further notifications', () => {
    const { store, emit } = makeMockStore()
    const { effect, notify } = makeEffect()

    const teardown = effect(makeContext(), [store])
    teardown()

    jest.advanceTimersByTime(COOLDOWN_MS)
    emit('failedPush')

    expect(notify).not.toHaveBeenCalled()
  })

  test('teardown unsubscribes all stores', () => {
    const s1 = makeMockStore()
    const s2 = makeMockStore()
    const { effect, notify } = makeEffect()

    const teardown = effect(makeContext(), [s1.store, s2.store])
    teardown()

    jest.advanceTimersByTime(COOLDOWN_MS)
    s1.emit('failedPush')
    s2.emit('failedPush')

    expect(notify).not.toHaveBeenCalled()
  })
})
