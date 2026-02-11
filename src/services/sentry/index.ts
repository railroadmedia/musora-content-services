import type { ErrorEvent, TransactionEvent, EventHint, TracesSamplerSamplingContext } from '@sentry/core'

// Input handler types - can return undefined to pass through
type BeforeSendHandler = (event: ErrorEvent, hint: EventHint) => ErrorEvent | PromiseLike<ErrorEvent | null> | null | undefined
type BeforeSendTransactionHandler = (event: TransactionEvent, hint: EventHint) => TransactionEvent | PromiseLike<TransactionEvent | null> | null | undefined
type TracesSamplerHandler = (context: TracesSamplerSamplingContext) => number | boolean | undefined

// Output types - match Sentry's expected signatures (no undefined)
type BeforeSend = (event: ErrorEvent, hint: EventHint) => ErrorEvent | PromiseLike<ErrorEvent | null> | null
type BeforeSendTransaction = (event: TransactionEvent, hint: EventHint) => TransactionEvent | PromiseLike<TransactionEvent | null> | null
type TracesSampler = (context: TracesSamplerSamplingContext) => number | boolean

// Compose multiple handlers of the same type into one.
// Stops at first handler that returns a non-undefined value.

export function composeHandlers(...handlers: BeforeSendHandler[]): BeforeSend;
export function composeHandlers(...handlers: BeforeSendTransactionHandler[]): BeforeSendTransaction;
export function composeHandlers(...handlers: TracesSamplerHandler[]): TracesSampler;
export function composeHandlers<H extends (...args: never[]) => unknown>(...handlers: H[]): H {
  return ((...args: Parameters<H>) => {
    for (const handler of handlers) {
      const res = handler(...args);
      if (res !== undefined) return res;
    }
    return args[0]
  }) as H;
}
