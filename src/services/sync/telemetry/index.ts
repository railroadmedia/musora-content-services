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
}

export type StartSpanOptions = Parameters<typeof InjectedSentry.startSpan>[0]
export type Span = InjectedSentry.Span

export const SYNC_TELEMETRY_TRACE_PREFIX = 'sync:'

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

  // allows us to know if Sentry shouldn't double-capture a dev-prettified console.error log
  private _ignoreConsole = false

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

    watermelonLogger.log = (message: unknown) => this.log(message instanceof Error ? message : ['[Watermelon]', message].join(' '))
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
        'user.initialId': this.userScope.initialId,
        'user.currentId': this.userScope.getCurrentId(),
      },
    }
    return this.Sentry.startSpan<T>(options, (span) => {
      let desc = span['_spanId'].slice(0, 4)
      desc += span['_parentSpanId'] ? ` (< ${span['_parentSpanId'].slice(0, 4)})` : ''

      this.debug(`[trace:start] ${options.name} (${desc})`)
      const result = callback(span)
      Promise.resolve(result).finally(() => this.debug(`[trace:end] ${options.name} (${desc})`))

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

    this._ignoreConsole = true
    this.error(err instanceof Error ? err.message : String(err))
    this._ignoreConsole = false
  }

  // allows us to know if Sentry shouldn't double-capture a dev-prettified console.error log
  shouldIgnoreConsole() {
    return this._ignoreConsole
  }

  /**
   * Ignore messages/errors in the future that match provided patterns
   */
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

  debug(message: unknown, extra?: any) {
    this._log(SeverityLevel.DEBUG, 'info', message, extra)
  }

  info(message: unknown, extra?: any) {
    this._log(SeverityLevel.INFO, 'info', message, extra)
  }

  log(message: unknown, extra?: any) {
    this._log(SeverityLevel.LOG, 'log', message, extra)
  }

  warn(message: unknown, extra?: any) {
    this._log(SeverityLevel.WARNING, 'warn', message, extra)
  }

  error(message: unknown, extra?: any) {
    this._log(SeverityLevel.ERROR, 'error', message, extra)
  }

  fatal(message: unknown, extra?: any) {
    this._log(SeverityLevel.FATAL, 'error', message, extra)
  }

  _log(level: SeverityLevel, consoleMethod: 'info' | 'log' | 'warn' | 'error', message: unknown, extra?: any) {
    if (this.level > level || this.shouldIgnoreMessage(message)) return
    this._ignoreConsole = true
    console[consoleMethod](...this.formattedConsoleMessage(message, extra))
    this._ignoreConsole = false

    if (level >= SeverityLevel.WARNING) {
      this.Sentry.captureMessage(message instanceof Error ? message.message : String(message), severityLevelToSentryLevel[level])
    } else {
      this.Sentry.addBreadcrumb({ message: message instanceof Error ? message.message : String(message), level: severityLevelToSentryLevel[level] })
    }
  }

  private formattedConsoleMessage(message: unknown, extra: any) {
    if (!this.pretty) {
      return [message, ...(extra ? [extra] : [])]
    }

    const date = new Date()
    return [...this.consolePrefix(date), message, ...(extra ? [extra] : []), ...this.consoleSuffix(date)]
  }

  private consolePrefix(date: Date) {
    const now = Math.round(date.getTime() / 1000).toString()
    return [
      `📡 SYNC: (%c${now.slice(0, 5)}%c${now.slice(5, 10)})`,
      'color: #ccc',
      'font-weight: bold;',
    ]
  }

  private consoleSuffix(date: Date) {
    return [` [${date.toLocaleTimeString()}, ${date.getTime()}]`]
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
