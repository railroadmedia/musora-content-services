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

  // allows us to know if Sentry shouldn't double-capture a dev-prettified console.error log
  private _ignoreConsole = false

  constructor(userId: string, { Sentry }: { Sentry: SentryLike }) {
    this.userId = userId
    this.Sentry = Sentry
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

  capture(err: SyncError) {
    err.markReported()
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

  debug(...messages: any[]) {
    console.debug(...this.formattedConsoleMessages(...messages));
    this.recordBreadcrumb('debug', ...messages)
  }

  info(...messages: any[]) {
    console.info(...this.formattedConsoleMessages(...messages));
    this.recordBreadcrumb('info', ...messages)
  }

  log(...messages: any[]) {
    console.log(...this.formattedConsoleMessages(...messages));
    this.recordBreadcrumb('log', ...messages)
  }

  warn(...messages: any[]) {
    console.warn(...this.formattedConsoleMessages(...messages));
    this.recordBreadcrumb('warning', ...messages)
  }

  error(...messages: any[]) {
    console.error(...this.formattedConsoleMessages(...messages));
    this.recordBreadcrumb('error', ...messages)
  }

  fatal(...messages: any[]) {
    console.error(...this.formattedConsoleMessages(...messages));
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
}
