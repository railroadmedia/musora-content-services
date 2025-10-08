import watermelonLogger from '@nozbe/watermelondb/utils/common/logger'
import { SyncError } from '../errors'

import * as InjectedSentry from '@sentry/browser'
export type SentryBrowserOptions = Parameters<typeof InjectedSentry.init>[0];

export type SentryLike = {
  captureException: typeof InjectedSentry.captureException
  addBreadcrumb: typeof InjectedSentry.addBreadcrumb
  startSpan: typeof InjectedSentry.startSpan
}

export type StartSpanOptions = Parameters<typeof InjectedSentry.startSpan>[0]
export type Span = InjectedSentry.Span

export const SYNC_TELEMETRY_TRACE_PREFIX = 'sync:'

export class SyncTelemetry {
  private userId: string
  private Sentry: SentryLike;

  constructor(userId: string, { Sentry }: { Sentry: SentryLike }) {
    this.userId = userId
    this.Sentry = Sentry
    watermelonLogger.log = (...messages: any[]) => this.log('[Watermelon]', ...messages);
    watermelonLogger.warn = (...messages: any[]) => this.warn('[Watermelon]', ...messages);
    watermelonLogger.error = (...messages: any[]) => this.error('[Watermelon]', ...messages);
  }

  trace<T>(opts: StartSpanOptions, callback: (span: Span) => T) {
    const options = {
      ...opts,
      name: `${SYNC_TELEMETRY_TRACE_PREFIX}${opts.name}`,
      op: `${SYNC_TELEMETRY_TRACE_PREFIX}${opts.op}`,
      attributes: {
        ...opts.attributes,
        userId: this.userId
      }
    }
    const span = this.Sentry.startSpan<T>(options, (span) => {
      let desc = span['_spanId'].slice(0, 4)
      desc += span['_parentSpanId'] ? ` (< ${span['_parentSpanId'].slice(0, 4)})` : ''

      this.debug(`[trace:start] ${options.name} (${desc})`)
      const result = callback(span)
      Promise.resolve(result).finally(() => this.debug(`[trace:end] ${options.name} (${desc})`))

      return result
    })

    return span
  }

  capture(err: Error) {
    if (!(err instanceof SyncError) || !err.isReported()) {
      this.Sentry.captureException(err)

      if (err instanceof SyncError) {
        err.markReported()
      }
    }
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
