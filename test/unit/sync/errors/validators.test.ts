import { percent, nullableString, string, number, varchar, numberInRange, enumValue } from '../../../../src/services/sync/errors/validators'
import { SyncValidationError } from '../../../../src/services/sync/errors/index'
describe('validators', () => {
  describe('percent', () => {
    test('returns value when within 0-100', () => {
      expect(percent(50)).toBe(50)
    })
  })
  test('returns 0 at minimum boundary', () => {
    expect(percent(0)).toBe(0)
  })
  test('returns 100 at maximum boundary', () => {
    expect(percent(100)).toBe(100)
  })
  test('throws SyncValidationError when value exceeds 100', () => {
    expect(() => percent(101)).toThrow(SyncValidationError)
  })
  test('throws SyncValidationError when value is negative', () => {
    expect(() => percent(-1)).toThrow(SyncValidationError)
  })
})
describe('nullableString', () => {
  test('returns null when value is null', () => {
    expect(nullableString(null)).toBeNull()
  })
  test('returns string when value is a string', () => {
    expect(nullableString('hello')).toBe('hello')
  })
})
describe('string', () => {
  test('throws SyncValidationError when value is not a string', () => {
    expect(() => string(123)).toThrow(SyncValidationError)
  })
})
describe('number', () => {
  test('throws SyncValidationError when value is not a number', () => {
    expect(() => number('abc')).toThrow(SyncValidationError)
  })
})
describe('varchar', () => {
  test('returns string when within max length', () => {
    expect(varchar(10)('hello')).toBe('hello')
  })
  test('throws SyncValidationError when string exceeds max length', () => {
    expect(() => varchar(5)('toolong')).toThrow(SyncValidationError)
  })
})
describe('numberInRange', () => {
  test('returns value when within range', () => {
    expect(numberInRange(0, 10)(5)).toBe(5)
  })
  test('throws SyncValidationError when value exceeds max', () => {
    expect(() => numberInRange(0, 10)(11)).toThrow(SyncValidationError)
  })
})
describe('enumValue', () => {
  test('throws SyncValidationError when value is not in enum', () => {
    enum TestEnum { A = 'a', B = 'b' }
    expect(() => enumValue(TestEnum)('c')).toThrow(SyncValidationError)
  })
})
