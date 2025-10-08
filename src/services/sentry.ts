import * as Sentry from "@sentry/browser";

type SentryBrowserInitOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

type TracesSampler = SentryBrowserInitOptions['tracesSampler'];
type BeforeSend = SentryBrowserInitOptions['beforeSend'];
type BeforeSendTransaction = SentryBrowserInitOptions['beforeSendTransaction'];

// Compose multiple handlers of the same type into one.
// Stops at first handler that returns a non-undefined value.

export function composeHandlers<H extends TracesSampler>(...handlers: H[]): H;
export function composeHandlers<H extends BeforeSend>(...handlers: H[]): H;
export function composeHandlers<H extends BeforeSendTransaction>(...handlers: H[]): H;
export function composeHandlers<H extends (...args: any[]) => any>(...handlers: H[]): H {
  return ((...args: Parameters<H>) => {
    for (const handler of handlers) {
      const res = handler(...args);
      if (res !== undefined) return res;
    }
  }) as H;
}
