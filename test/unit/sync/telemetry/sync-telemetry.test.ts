import { SyncTelemetry, SeverityLevel } from '../../../../src/services/sync/telemetry/index'
import { SyncError, SyncUnexpectedError } from '../../../../src/services/sync/errors/index'
import { makeUserScope } from '../helpers/index'
const makeSentry = () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  startSpan: jest.fn(),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
  },
})
const makeTelemetry = (level = SeverityLevel.DEBUG) => {
  const sentry = makeSentry()
  const telemetry = new SyncTelemetry(makeUserScope(), {
    Sentry: sentry,
    level,
    pretty: false,
  })
  return { telemetry, sentry }
}
describe('SyncTelemetry', () => {
  afterEach(() => {
    SyncTelemetry.clearInstance()
  })
  describe('static methods', () => {
    test('setInstance and getInstance round-trip', () => {
      const { telemetry } = makeTelemetry()
      SyncTelemetry.setInstance(telemetry)
      expect(SyncTelemetry.getInstance()).toBe(telemetry)
    })
    test('clearInstance sets instance to null', () => {
      const { telemetry } = makeTelemetry()
      SyncTelemetry.setInstance(telemetry)
      SyncTelemetry.clearInstance()
      expect(SyncTelemetry.getInstance()).toBeNull()
    })
    test('isSyncConsoleMessage returns true for sync-prefixed messages', () => {
      expect(SyncTelemetry.isSyncConsoleMessage(['📡 SYNC: something'])).toBe(true)
    })
    test('isSyncConsoleMessage returns false for non-sync messages', () => {
      expect(SyncTelemetry.isSyncConsoleMessage(['regular message'])).toBe(false)
    })
  })
  describe('capture', () => {
    // BUG: condition checks `err instanceof SyncUnexpectedError` but err is the original Error,
    // not the wrapped one. mechanism: { handled: false } is never triggered for plain Errors.
    // Should be checking `wrapped instanceof SyncUnexpectedError` instead.
    test('calls captureException with undefined when err is a plain Error', () => {
      const { telemetry, sentry } = makeTelemetry()
      const error = new Error('raw error')
      telemetry.capture(error)
      expect(sentry.captureException).toHaveBeenCalledWith(error, undefined)
    })
    test('passes mechanism handled:false when err is SyncUnexpectedError', () => {
      const { telemetry, sentry } = makeTelemetry()
      const error = new SyncUnexpectedError('unexpected')
      telemetry.capture(error)
      expect(sentry.captureException).toHaveBeenCalledWith(error, { mechanism: { handled: false } })
    })
    test('passes SyncError directly without wrapping', () => {
      const { telemetry, sentry } = makeTelemetry()
      const error = new SyncError('sync error')
      telemetry.capture(error)
      expect(sentry.captureException).toHaveBeenCalledWith(error, undefined)
    })
    test('marks error as reported after capture', () => {
      const { telemetry } = makeTelemetry()
      const error = new SyncError('sync error')
      telemetry.capture(error)
      expect(error.isReported()).toBe(true)
    })
  })
  describe('ignoreLike and shouldIgnoreMessage', () => {
    test('ignoreLike with string suppresses matching messages', () => {
      const { telemetry, sentry } = makeTelemetry()
      telemetry.ignoreLike('ignored message')
      telemetry.debug('ignored message')
      expect(sentry.addBreadcrumb).not.toHaveBeenCalled()
    })
    test('ignoreLike with RegExp suppresses matching messages', () => {
      const { telemetry, sentry } = makeTelemetry()
      telemetry.ignoreLike(/ignore.*/)
      telemetry.debug('ignore this')
      expect(sentry.addBreadcrumb).not.toHaveBeenCalled()
    })
    test('shouldIgnoreRejection returns true for matching error', () => {
      const { telemetry } = makeTelemetry()
      telemetry.ignoreLike('abort')
      expect(telemetry.shouldIgnoreRejection(new Error('abort error'))).toBe(true)
    })
    test('shouldIgnoreException returns true for matching Error', () => {
      const { telemetry } = makeTelemetry()
      telemetry.ignoreLike('abort')
      expect(telemetry.shouldIgnoreException(new Error('abort error'))).toBe(true)
    })
  })
  describe('level filtering', () => {
    test('debug does not call Sentry when level is above DEBUG', () => {
      const { telemetry, sentry } = makeTelemetry(SeverityLevel.ERROR)
      telemetry.debug('debug message')
      expect(sentry.addBreadcrumb).not.toHaveBeenCalled()
    })
    test('warn calls captureException with correct level', () => {
      const { telemetry, sentry } = makeTelemetry()
      const error = new Error('warn error')
      telemetry.warn(error)
      expect(sentry.captureException).toHaveBeenCalledWith(error, { level: 'warning' })
    })
    test('error calls captureException with correct level', () => {
      const { telemetry, sentry } = makeTelemetry()
      const error = new Error('error message')
      telemetry.error(error)
      expect(sentry.captureException).toHaveBeenCalledWith(error, { level: 'error' })
    })
  })
})
