import watermelonLogger from '@nozbe/watermelondb/utils/common/logger'
import { SyncError, SyncUnexpectedError } from '../errors'

import * as InjectedSentry from '@sentry/browser'
export type SentryBrowserOptions = NonNullable<Parameters<typeof InjectedSentry.init>[0]>;

export type SentryLike = {
  captureException: typeof InjectedSentry.captureException
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
  FATAL = 5
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

  private userId: string
  private Sentry: SentryLike;
  private level: SeverityLevel
  private pretty: boolean

  private ignorePatterns: (string | RegExp)[] = []

  // allows us to know if Sentry shouldn't double-capture a dev-prettified console.error log
  private _ignoreConsole = false

  constructor(userId: string, { Sentry, level, pretty }: { Sentry: SentryLike, level?: keyof typeof SeverityLevel, pretty?: boolean }) {
    this.userId = userId
    this.Sentry = Sentry
    this.level = typeof level !== 'undefined' && level in SeverityLevel ? SeverityLevel[level] : SeverityLevel.LOG
    this.pretty = typeof pretty !== 'undefined' ? pretty : true

    watermelonLogger.log = (...messages: any[]) => this.log('[Watermelon]', ...messages);
    watermelonLogger.warn = (...messages: any[]) => this.warn('[Watermelon]', ...messages);
    watermelonLogger.error = (...messages: any[]) => this.error('[Watermelon]', ...messages);
  }

  trace<T>(opts: StartSpanOptions, callback: (_span: Span) => T) {
    const options = {
      ...opts,
      name: `${SYNC_TELEMETRY_TRACE_PREFIX}${opts.name}`,
      op: `${SYNC_TELEMETRY_TRACE_PREFIX}${opts.op}`,
      attributes: {
        ...opts.attributes,
        userId: this.userId
      }
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

  capture(err: Error, context = {}) {
    const wrapped = err instanceof SyncError ? err : new SyncUnexpectedError((err as Error).message, context);

    wrapped.markReported()
    this.Sentry.captureException(err, err instanceof SyncUnexpectedError ? {
      mechanism: {
        handled: false
      }
    } : undefined)

    this._ignoreConsole = true
    this.error(err.message)
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

  shouldIgnoreMessages(messages: any[]) {
    return messages.some(message => {
      return this.shouldIgnoreMessage(message)
    })
  }

  debug(...messages: any[]) {
    this.level <= SeverityLevel.DEBUG && !this.shouldIgnoreMessages(messages) && console.debug(...this.formattedConsoleMessages(...messages));
    this.recordBreadcrumb('debug', ...messages)
  }

  info(...messages: any[]) {
    this.level <= SeverityLevel.INFO && !this.shouldIgnoreMessages(messages) && console.info(...this.formattedConsoleMessages(...messages));
    this.recordBreadcrumb('info', ...messages)
  }

  log(...messages: any[]) {
    this.level <= SeverityLevel.LOG && !this.shouldIgnoreMessages(messages) && console.log(...this.formattedConsoleMessages(...messages));
    this.recordBreadcrumb('log', ...messages)
  }

  warn(...messages: any[]) {
    this.level <= SeverityLevel.WARNING && !this.shouldIgnoreMessages(messages) && console.warn(...this.formattedConsoleMessages(...messages));
    this.recordBreadcrumb('warning', ...messages)
  }

  error(...messages: any[]) {
    this.level <= SeverityLevel.ERROR && !this.shouldIgnoreMessages(messages) && console.error(...this.formattedConsoleMessages(...messages));
    this.recordBreadcrumb('error', ...messages)
  }

  fatal(...messages: any[]) {
    this.level <= SeverityLevel.FATAL && !this.shouldIgnoreMessages(messages) && console.error(...this.formattedConsoleMessages(...messages));
    this.recordBreadcrumb('fatal', ...messages)
  }

  private recordBreadcrumb(level: InjectedSentry.Breadcrumb['level'], ...messages: any[]) {
    this.Sentry.addBreadcrumb({
      message: messages.join(', '),
      level,
      category: 'sync',
    })
  }

  private formattedConsoleMessages(...messages: any[]) {
    if (!this.pretty) {
      return messages
    }

    const date = new Date();
    return [...this.consolePrefix(date), ...messages, ...this.consoleSuffix(date)];
  }

  private consolePrefix(date: Date) {
    const now = Math.round(date.getTime() / 1000).toString();
    return [`📡 SYNC: (%c${now.slice(0, 5)}%c${now.slice(5, 10)})`, 'color: #ccc', 'font-weight: bold;'];
  }

  private consoleSuffix(date: Date) {
    return [` [${date.toLocaleTimeString()}, ${date.getTime()}]`];
  }

  private shouldIgnoreMessage(message: any) {
    if (message instanceof Error) message = message.message
    if (typeof message !== 'string') return false

    return this.ignorePatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return message.indexOf(pattern) !== -1
      } else if (pattern instanceof RegExp) {
        return pattern.test(message)
      }
      return false
    })
  }
}
