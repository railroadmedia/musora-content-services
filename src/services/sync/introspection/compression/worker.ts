import { compressPayload } from './index'

if (typeof self !== 'undefined' && typeof (self as any).importScripts === 'function') {
  ;(self as any).onmessage = (event: MessageEvent<unknown>) => {
    ;(self as any).postMessage(compressPayload(event.data))
  }
}
