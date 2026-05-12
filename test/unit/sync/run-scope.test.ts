import SyncRunScope from '../../../src/services/sync/run-scope'
import { SyncAbortError } from '../../../src/services/sync/errors/index'
describe('SyncRunScope', () => {
  let scope: SyncRunScope
  beforeEach(() => {
    scope = new SyncRunScope()
  })
  test('signal returns the AbortSignal', () => {
    expect(scope.signal).toBeInstanceOf(AbortSignal)
  })
  test('abort aborts the signal', () => {
    scope.abort('test reason')
    expect(scope.signal.aborted).toBe(true)
  })
  test('abortable runs fn when not aborted and returns result', async () => {
    const result = await scope.abortable(() => Promise.resolve('hello'))
    expect(result).toBe('hello')
  })
  test('abortable rejects with SyncAbortError when already aborted', async () => {
    scope.abort('cancelled')
    await expect(scope.abortable(() => Promise.resolve('hello'))).rejects.toThrow(SyncAbortError)
  })
})
