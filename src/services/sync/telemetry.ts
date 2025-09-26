import watermelonLogger from '@nozbe/watermelondb/utils/common/logger'
import { SyncError } from './errors'

import * as InjectedSentry from '@sentry/browser'
type SentryBrowserOptions = Parameters<typeof InjectedSentry.init>[0];

export const syncSentryBeforeSend: NonNullable<SentryBrowserOptions['beforeSend']> = (event, hint) => {
  if (hint.originalException instanceof SyncError && hint.originalException.isReported()) {
    return null
  }
  return event
}
export const syncSentryBeforeSendTransaction: NonNullable<SentryBrowserOptions['beforeSendTransaction']> = (event, hint) => {
  debugger
  return event
}

export type SentryLike = {
  captureException: typeof InjectedSentry.captureException
  addBreadcrumb: typeof InjectedSentry.addBreadcrumb
}
export class SyncTelemetry {
  private Sentry: SentryLike;

  constructor({ Sentry }: { Sentry: SentryLike }) {
    this.Sentry = Sentry
    watermelonLogger.log = (...messages: any[]) => this.log('[Watermelon]', ...messages);
    watermelonLogger.warn = (...messages: any[]) => this.warn('[Watermelon]', ...messages);
    watermelonLogger.error = (...messages: any[]) => this.error('[Watermelon]', ...messages);
  }

  trace() {
    //
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
    return [` [${date.toLocaleTimeString()}, ${date.getTime()}`];
  }
}
