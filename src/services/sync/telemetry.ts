import watermelonLogger from '@nozbe/watermelondb/utils/common/logger'

class SyncTelemetry {
  constructor(w: typeof watermelonLogger) {
    w.log = (...messages: any[]) => this.log('[Watermelon]', ...messages)
    w.warn = (...messages: any[]) => this.warn('[Watermelon]', ...messages)
    w.error = (...messages: any[]) => this.error('[Watermelon]', ...messages)
  }

  debug(...messages: any[]) {
    console.debug(...this.formattedMessages(...messages))
  }

  info(...messages: any[]) {
    console.info(...this.formattedMessages(...messages))
  }

  log(...messages: any[]) {
    console.log(...this.formattedMessages(...messages))
  }

  warn(...messages: any[]) {
    console.warn(...this.formattedMessages(...messages))
  }

  error(...messages: any[]) {
    console.error(...this.formattedMessages(...messages))
  }

  fatal(...messages: any[]) {
    console.error(...this.formattedMessages(...messages))
  }

  private formattedMessages(...messages: any[]) {
    const date = new Date()
    return [...this.prefix(date), ...messages, ...this.suffix(date)]
  }

  private prefix(date: Date) {
    const now = Math.round(date.getTime() / 1000).toString();

    return [`📡 SYNC: (%c${now.slice(0, 5)}%c${now.slice(5, 10)})`, 'color: #ccc', 'font-weight: bold;']
  }

  private suffix(date: Date) {
    return [` [${date.toLocaleTimeString()}, ${date.getTime()}]`]
  }
}

export default new SyncTelemetry(watermelonLogger)
