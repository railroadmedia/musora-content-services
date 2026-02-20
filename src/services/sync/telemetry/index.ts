import { SyncUserScope } from '../index'
import watermelonLogger from '@nozbe/watermelondb/utils/common/logger'
import { SyncError, SyncUnexpectedError } from '../errors'

import * as InjectedSentry from '@sentry/browser'
export type SentryBrowserOptions = NonNullable<Parameters<typeof InjectedSentry.init>[0]>

export type SentryLike = {
  captureException: typeof InjectedSentry.captureException
  captureMessage: typeof InjectedSentry.captureMessage
  addBreadcrumb: typeof InjectedSentry.addBreadcrumb
  startSpan: typeof InjectedSentry.startSpan
  logger: typeof InjectedSentry.logger
}

export type StartSpanOptions = Parameters<typeof InjectedSentry.startSpan>[0]
export type Span = InjectedSentry.Span

export const SYNC_TELEMETRY_TRACE_PREFIX = 'sync:'
export const SYNC_TELEMETRY_CONSOLE_PREFIX = '📡 SYNC:'

export enum SeverityLevel {
  DEBUG = 0,
  INFO = 1,
  LOG = 2,
  WARNING = 3,
  ERROR = 4,
  FATAL = 5,
}

const severityLevelToSentryLevel: Record<SeverityLevel, 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'> = {
  [SeverityLevel.DEBUG]: 'debug',
  [SeverityLevel.INFO]: 'info',
  [SeverityLevel.LOG]: 'log',
  [SeverityLevel.WARNING]: 'warning',
  [SeverityLevel.ERROR]: 'error',
  [SeverityLevel.FATAL]: 'fatal',
}

type CaptureOptions = {
  tags?: Record<string, string>
  contexts?: Record<string, Record<string, unknown>>
  extra?: unknown
}
type LogAttributes = Record<string, unknown>

export class SyncTelemetry {
  private static instance: SyncTelemetry | null = null

  public static setInstance(instance: SyncTelemetry): SyncTelemetry {
    SyncTelemetry.instance = instance
    return instance
  }

  public static getInstance(): SyncTelemetry | null {
    return SyncTelemetry.instance
  }

  public static clearInstance(): void {
    SyncTelemetry.instance = null
  }

  private userScope: SyncUserScope
  private Sentry: SentryLike
  private level: SeverityLevel
  private pretty: boolean

  private ignorePatterns: (string | RegExp)[] = []

  constructor(
    userScope: SyncUserScope,
    {
      Sentry,
      level,
      pretty,
    }: { Sentry: SentryLike; level?: SeverityLevel | keyof typeof SeverityLevel; pretty?: boolean }
  ) {
    this.userScope = userScope
    this.Sentry = Sentry
    const normalizedLevel =
      typeof level === 'number'
        ? level
        : typeof level === 'string' && level in SeverityLevel
          ? SeverityLevel[level]
          : undefined

    this.level = typeof normalizedLevel === 'number' ? normalizedLevel : SeverityLevel.LOG
    this.pretty = typeof pretty !== 'undefined' ? pretty : true

    watermelonLogger.log = (message: unknown) => this.log(message instanceof Error ? message.message : ['[Watermelon]', message].join(' '))
    watermelonLogger.warn = (message: unknown) => this.warn(message instanceof Error ? message : ['[Watermelon]', message].join(' '))
    watermelonLogger.error = (message: unknown) => this.error(message instanceof Error ? message : ['[Watermelon]', message].join(' '))
  }

  trace<T>(opts: StartSpanOptions, callback: (_span: Span) => T) {
    const options = {
      ...opts,
      name: `${SYNC_TELEMETRY_TRACE_PREFIX}${opts.name}`,
      op: `${SYNC_TELEMETRY_TRACE_PREFIX}${opts.op}`,
      attributes: {
        ...opts.attributes,
        'user.id': this.userScope.initialId
      },
    }
    return this.Sentry.startSpan<T>(options, (span) => {
      let desc = span['_spanId'].slice(0, 4)
      desc += span['_parentSpanId'] ? ` (< ${span['_parentSpanId'].slice(0, 4)})` : ''

      this.consoleLog(SeverityLevel.DEBUG, 'info', `[trace:start] ${options.name} (${desc})`)
      const result = callback(span)
      Promise.resolve(result).finally(() => this.consoleLog(SeverityLevel.DEBUG, 'info', `[trace:end] ${options.name} (${desc})`))

      return result
    })
  }

  capture(err: unknown, context = {}) {
    const wrapped =
      err instanceof SyncError ? err : new SyncUnexpectedError((err as Error).message, context)

    wrapped.markReported()
    this.Sentry.captureException(
      err,
      err instanceof SyncUnexpectedError
        ? {
            mechanism: {
              handled: false,
            },
          }
        : undefined
    )

    this.consoleLog(SeverityLevel.ERROR, 'error', err)
  }

  debug(message: string, attrs?: LogAttributes) {
    this.logMessage(SeverityLevel.DEBUG, 'info', message, attrs)
  }

  info(message: string, attrs?: LogAttributes) {
    this.logMessage(SeverityLevel.INFO, 'info', message, attrs)
  }

  log(message: string, attrs?: LogAttributes) {
    this.logMessage(SeverityLevel.LOG, 'log', message, attrs)
  }

  warn(message: unknown, opts?: CaptureOptions) {
    this.captureError(SeverityLevel.WARNING, 'warn', message, opts)
  }

  error(message: unknown, opts?: CaptureOptions) {
    this.captureError(SeverityLevel.ERROR, 'error', message, opts)
  }

  fatal(message: unknown, opts?: CaptureOptions) {
    this.captureError(SeverityLevel.FATAL, 'error', message, opts)
  }

  private logMessage(level: SeverityLevel, consoleMethod: 'info' | 'log', message: string, attrs?: LogAttributes) {
    if (this.level > level) return
    if (this.shouldIgnoreMessage(message)) return

    console[consoleMethod](...this.consoleFormattedMessage(message, attrs))
    const sentryLevel = severityLevelToSentryLevel[level]
    const sentryLogMethod = sentryLevel === 'debug' ? 'debug' : 'info'
    this.Sentry.addBreadcrumb({
      message,
      data: attrs,
      level: sentryLevel,
    })
    this.Sentry.logger[sentryLogMethod](message, attrs)
  }

  private captureError(level: SeverityLevel, consoleMethod: 'warn' | 'error', error: unknown, opts: CaptureOptions) {
    if (this.level > level) return
    if (error instanceof Error && this.shouldIgnoreMessage(error.message)) return
    if (typeof error === 'string' && this.shouldIgnoreMessage(error)) return

    console[consoleMethod](...this.consoleFormattedMessage(error, opts))
    this.Sentry.captureException(error, { level: severityLevelToSentryLevel[level] })
  }

  private consoleLog(level: SeverityLevel, consoleMethod: 'info' | 'log' | 'warn' | 'error', message: unknown, extra?: any) {
    if (this.level > level || this.shouldIgnoreMessage(message)) return
    console[consoleMethod](...this.consoleFormattedMessage(message, extra))
  }

  static isSyncConsoleMessage(args: unknown[]): boolean {
    return typeof args[0] === 'string' && args[0].startsWith(SYNC_TELEMETRY_CONSOLE_PREFIX)
  }

  private consoleFormattedMessage(message: unknown, remnant: CaptureOptions | LogAttributes) {
    if (!this.pretty) {
      return [message, ...(remnant ? [remnant] : [])]
    }

    const date = new Date()
    return [...this.consolePrefix(date), message, ...(remnant ? [remnant] : []), ...this.consoleSuffix(date)]
  }

  private consolePrefix(date: Date) {
    const now = Math.round(date.getTime() / 1000).toString()
    return [
      `${SYNC_TELEMETRY_CONSOLE_PREFIX} (%c${now.slice(0, 5)}%c${now.slice(5, 10)})`,
      'color: #ccc',
      'font-weight: bold;',
    ]
  }

  private consoleSuffix(date: Date) {
    return [` [${date.toLocaleTimeString()}, ${date.getTime()}]`]
  }

  ignoreLike(...patterns: (RegExp | string)[]) {
    this.ignorePatterns.push(...patterns)
  }

  shouldIgnoreRejection(reason: any) {
    const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : reason
    return this.shouldIgnoreMessage(message)
  }

  shouldIgnoreException(exception: unknown) {
    if (exception instanceof Error) {
      return this.shouldIgnoreMessage(exception.message)
    }

    return false
  }

  private shouldIgnoreMessage(message: any) {
    if (message instanceof Error) message = message.message
    if (typeof message !== 'string') return false

    return this.ignorePatterns.some((pattern) => {
      if (typeof pattern === 'string') {
        return message.indexOf(pattern) !== -1
      } else if (pattern instanceof RegExp) {
        return pattern.test(message)
      }
      return false
    })
  }
}
