import { SyncError, SyncValidationError, SyncAbortError, SyncInitError, SyncSetupError, SyncUnexpectedError } from '../../../../src/services/sync/errors/index'
import { inBoundary } from '../../../../src/services/sync/errors/boundary'
import { SyncTelemetry } from '../../../../src/services/sync/telemetry/index'

jest.spyOn(SyncTelemetry, 'getInstance').mockReturnValue({
  capture: jest.fn()
} as any)

describe('SyncError', () => {
  test('has correct name property', () => {
    const error = new SyncError('test message')
    expect(error.name).toBe('SyncError')
  })
  test('isReported() returns false by default', () => {
    const error = new SyncError('test message')
    expect(error.isReported()).toBe(false)
  })
  test('markReported() sets isReported() to true', () => {
    const error = new SyncError('test message')
    error.markReported()
    expect(error.isReported()).toBe(true)
  })
  test('getDetails() returns details passed to constructor', () => {
    const details = { table: 'content_progress', userId: 1 }
    const error = new SyncError('test message', details)
    expect(error.getDetails()).toEqual(details)
  })
})
describe('SyncValidationError', () => {
  test('has correct name property', () => {
    const error = new SyncValidationError('invalid value', {} as any)
    expect(error.name).toBe('SyncValidationError')
  })
  test('is instanceof SyncError', () => {
    const error = new SyncValidationError('invalid value', {} as any)
    expect(error).toBeInstanceOf(SyncError)
  })
})
describe('SyncAbortError', () => {
  test('has default message when none provided', () => {
    const error = new SyncAbortError()
    expect(error.message).toBe('Sync operation was aborted')
  })
  test('accepts custom message', () => {
    const error = new SyncAbortError('custom abort message')
    expect(error.message).toBe('custom abort message')
  })
})
describe('SyncInitError', () => {
  test('has correct name and stores cause in details', () => {
    const cause = new Error('original error')
    const error = new SyncInitError(cause)
    expect(error.name).toBe('SyncInitError')
    expect(error.getDetails()).toEqual({ cause })
  })
})
describe('SyncSetupError', () => {
  test('is instanceof SyncError', () => {
    const error = new SyncSetupError(new Error('setup failed'))
    expect(error).toBeInstanceOf(SyncError)
  })
})
describe('SyncUnexpectedError', () => {
  test('is instanceof SyncError', () => {
    const error = new SyncUnexpectedError('unexpected')
    expect(error).toBeInstanceOf(SyncError)
  })
})

describe('inBoundary', () => {
  let mockCapture: jest.Mock

  beforeEach(() => {
    mockCapture = jest.fn()
    jest.spyOn(SyncTelemetry, 'getInstance').mockReturnValue({
      capture: mockCapture
    } as any)
  })
  test('returns result of sync function when no error', () => {
    const result = inBoundary(() => 'hello')
    expect(result).toBe('hello')
    expect(mockCapture).not.toHaveBeenCalled()
  })
  test('throws and calls capture when sync function throws', () => {
    const error = new Error('sync error')
    expect(() => inBoundary(() => { throw error })).toThrow('sync error')
    expect(mockCapture).toHaveBeenCalledWith(error, undefined)
  })
  test('returns resolved value of async function when no error', async () => {
    const result = await inBoundary(async () => 'async hello')
    expect(result).toBe('async hello')
    expect(mockCapture).not.toHaveBeenCalled()
  })
  test('re-throws and calls capture when async function rejects', async () => {
    const error = new Error('async error')
    await expect(inBoundary(async () => { throw error })).rejects.toThrow('async error')
    expect(mockCapture).toHaveBeenCalledWith(error, undefined)
  })
  test('passes context to fn and to capture on error', () => {
    const context = { table: 'content_progress' }
    const error = new Error('context error')
    expect(() => inBoundary((ctx) => { throw error }, context)).toThrow('context error')
    expect(mockCapture).toHaveBeenCalledWith(error, context)
  })
})

