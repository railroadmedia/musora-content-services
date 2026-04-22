import PushCoalescer from '@/services/sync/store/push-coalescer'
import type BaseModel from '@/services/sync/models/Base'
import type { SyncPushResponse } from '@/services/sync/fetch'

const BASE_TIME = 1700000000000
const SUCCESS_RESPONSE: SyncPushResponse = { ok: true, results: [] }

class TestSetup {
  coalescer = new PushCoalescer()

  record(id: string, timeOffset = 0): BaseModel {
    return { id, updated_at: BASE_TIME + timeOffset } as unknown as BaseModel
  }

  mockPusher() {
    return jest.fn().mockReturnValue(new Promise(() => {}))
  }

  controllablePusher() {
    let resolve!: (value: SyncPushResponse) => void
    let reject!: (error: Error) => void

    const promise = new Promise<SyncPushResponse>((res, rej) => {
      resolve = res
      reject = rej
    })

    return {
      pusher: jest.fn().mockReturnValue(promise),
      resolve: () => resolve(SUCCESS_RESPONSE),
      reject: (error: Error) => reject(error)
    }
  }
}

let setup: TestSetup
beforeEach(() => {
  setup = new TestSetup()
})

describe('coalescing behavior', () => {
  describe('when to coalesce', () => {
    test('identical records return same promise', () => {
      const records = [setup.record('rec-1')]
      const pusher = setup.mockPusher()

      const p1 = setup.coalescer.push(records, pusher)
      const p2 = setup.coalescer.push(records, pusher)

      expect(p1).toBe(p2)
      expect(pusher).toHaveBeenCalledTimes(1)
    })

    test('same timestamp coalesces', () => {
      const pusher = setup.mockPusher()
      const p1 = setup.coalescer.push([setup.record('rec-1')], pusher)
      const p2 = setup.coalescer.push([setup.record('rec-1')], pusher)

      expect(p1).toBe(p2)
      expect(pusher).toHaveBeenCalledTimes(1)
    })

    test('all records must match for multi-record coalescing', () => {
      const pusher = setup.mockPusher()
      const records = [setup.record('rec-1'), setup.record('rec-2')]

      const p1 = setup.coalescer.push(records, pusher)
      const p2 = setup.coalescer.push([setup.record('rec-1'), setup.record('rec-2')], pusher)

      expect(p1).toBe(p2)
      expect(pusher).toHaveBeenCalledTimes(1)
    })
  })

  describe('when NOT to coalesce', () => {
    test('newer timestamp triggers new push', () => {
      const pusher = setup.mockPusher()

      setup.coalescer.push([setup.record('rec-1')], pusher)
      setup.coalescer.push([setup.record('rec-1', 1)], pusher) // +1ms newer

      expect(pusher).toHaveBeenCalledTimes(2)
    })

    test('different record IDs trigger separate pushes', () => {
      const pusher = setup.mockPusher()

      setup.coalescer.push([setup.record('rec-1')], pusher)
      setup.coalescer.push([setup.record('rec-2')], pusher)

      expect(pusher).toHaveBeenCalledTimes(2)
    })

    test('partial record match prevents coalescing', () => {
      const pusher = setup.mockPusher()

      setup.coalescer.push([setup.record('rec-1'), setup.record('rec-2')], pusher)
      setup.coalescer.push([setup.record('rec-1'), setup.record('rec-2', 1)], pusher) // rec-2 newer

      expect(pusher).toHaveBeenCalledTimes(2)
    })
  })
})

describe('intent lifecycle', () => {
  test('cleans up after successful push', async () => {
    const { pusher, resolve } = setup.controllablePusher()
    const records = [setup.record('rec-1')]

    setup.coalescer.push(records, pusher)
    resolve()
    await Promise.resolve() // flush cleanup

    // Should trigger new push since intent was cleaned up
    const newPusher = setup.mockPusher()
    setup.coalescer.push(records, newPusher)
    expect(newPusher).toHaveBeenCalled()
  })

  test('cleans up after failed push', async () => {
    const { pusher, reject } = setup.controllablePusher()
    const records = [setup.record('rec-1')]

    const promise = setup.coalescer.push(records, pusher)
    promise.catch(() => {}) // prevent unhandled rejection

    reject(new Error('push failed'))
    await Promise.resolve()

    const newPusher = setup.mockPusher()
    setup.coalescer.push(records, newPusher)
    expect(newPusher).toHaveBeenCalled()
  })

  test('coalesces while intent is in-flight', () => {
    const { pusher } = setup.controllablePusher()
    const records = [setup.record('rec-1')]

    const p1 = setup.coalescer.push(records, pusher)
    const p2 = setup.coalescer.push(records, setup.mockPusher())

    expect(p1).toBe(p2) // Same promise returned
  })
})

describe('edge cases', () => {
  test('empty record arrays coalesce', () => {
    const pusher = setup.mockPusher()

    const p1 = setup.coalescer.push([], pusher)
    const p2 = setup.coalescer.push([], pusher)

    expect(p1).toBe(p2)
    expect(pusher).toHaveBeenCalledTimes(1)
  })
})
