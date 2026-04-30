import { composeHandlers } from '../../src/services/sentry/index'

test('returns value from first handler when it returns non-defined', () => {
  const first = jest.fn().mockReturnValue('first')
  const second = jest.fn().mockReturnValue('second')
  const composed = composeHandlers(first, second)
  const result = composed('arg1' as any, 'arg2' as any)

  expect(result).toBe('first')
})

test('does not call subsequent handlers when first returns a value', () => {
  const first = jest.fn().mockReturnValue('first')
  const second = jest.fn().mockReturnValue('second')
  const composed = composeHandlers(first, second)
  composed('arg1' as any, 'arg2' as any)
  expect(second).not.toHaveBeenCalled()
})

test('skips first handler returning undefined and uses second', () => {
  const first = jest.fn().mockReturnValue(undefined)
  const second = jest.fn().mockReturnValue('second')
  const composed = composeHandlers(first, second)
  const result = composed('arg1' as any, 'arg2' as any)

  expect(result).toBe('second')
})

test('skips multiple undefined handlers to find first returning value', () => {
  const first = jest.fn().mockReturnValue(undefined)
  const second = jest.fn().mockReturnValue(undefined)
  const third = jest.fn().mockReturnValue('third')
  const composed = composeHandlers(first, second, third)
  const result = composed('arg1' as any, 'arg2' as any)

  expect(result).toBe('third')
})

test('returns args[0] when all handlers return undefined', () => {
  const first = jest.fn().mockReturnValue(undefined)
  const second = jest.fn().mockReturnValue(undefined)
  const composed = composeHandlers(first, second)
  const result = composed('fallback' as any, 'arg2' as any)

  expect(result).toBe('fallback')
})

test('returns args[0] when no handlers are provided', () => {
  const composed = composeHandlers()
  const result = composed('fallback' as any, 'arg2' as any)
  expect(result).toBe('fallback')
})


test('passes all arguments to each handler', () => {
  const first = jest.fn().mockReturnValue(undefined)
  const second = jest.fn().mockReturnValue('second')
  const composed = composeHandlers(first, second)
  composed('arg1' as any, 'arg2' as any)
  expect(first).toHaveBeenCalledWith('arg1', 'arg2')
  expect(second).toHaveBeenCalledWith('arg1', 'arg2')
})
