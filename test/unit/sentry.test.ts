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
