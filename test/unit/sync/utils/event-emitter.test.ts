import EventEmitter from '../../../../src/services/sync/utils/event-emitter'
type TestEvents = {
  data: [string]
  update: [number, boolean]
}
describe('EventEmitter', () => {
  let emitter: EventEmitter<TestEvents>
  beforeEach(() => {
    emitter = new EventEmitter()
  })
  test('on registers a listener and returns an unsubscribe function', () => {
    const listener = jest.fn()
    const unsubscribe = emitter.on('data', listener)
    expect(typeof unsubscribe).toBe('function')
  })
  test('emit calls all registered listeners with correct args', () => {
    const listener = jest.fn()
    emitter.on('data', listener)
    emitter.emit('data', 'hello')
    expect(listener).toHaveBeenCalledWith('hello')
  })
  test('off with a specific function removes only that listener', () => {
    const first = jest.fn()
    const second = jest.fn()
    emitter.on('data', first)
    emitter.on('data', second)
    emitter.off('data', first)
    emitter.emit('data', 'hello')
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith('hello')
  })
  test('off without a function removes all listeners for that event', () => {
    const first = jest.fn()
    const second = jest.fn()
    emitter.on('data', first)
    emitter.on('data', second)
    emitter.off('data')
    emitter.emit('data', 'hello')
    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
  })
  test('unsubscribe function returned by on removes the listener', () => {
    const listener = jest.fn()
    const unsubscribe = emitter.on('data', listener)
    unsubscribe()
    emitter.emit('data', 'hello')
    expect(listener).not.toHaveBeenCalled()
  })
  test('emit on an event with no listeners does nothing', () => {
    expect(() => emitter.emit('data', 'hello')).not.toThrow()
  })
  test('multiple listeners on same event all receive the emit', () => {
    const first = jest.fn()
    const second = jest.fn()
    const third = jest.fn()
    emitter.on('data', first)
    emitter.on('data', second)
    emitter.on('data', third)
    emitter.emit('data', 'hello')
    expect(first).toHaveBeenCalledWith('hello')
    expect(second).toHaveBeenCalledWith('hello')
    expect(third).toHaveBeenCalledWith('hello')
  })
})
