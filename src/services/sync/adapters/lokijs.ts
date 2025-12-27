import { SyncTelemetry } from '../telemetry'

import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
export { LokiJSAdapter as default }

import { deleteDatabase } from '@nozbe/watermelondb/adapters/lokijs/worker/lokiExtensions'

/**
 * Mute impending driver errors that are expected after sync adapter failure
 */
export function muteImpendingDriverErrors() {
  SyncTelemetry.getInstance()?.ignoreLike(
    'Cannot run actions because driver is not set up',
    /The reader you're trying to run \(.+\) can't be performed yet/
  )
}

/**
 * Patch IndexedDB open to listen for specifically definitely asynchronous errors
 */
export function patchIndexedDBOpenErrors(
  onAnyError: (error: Error | DOMException | null, event: Event) => void
) {
  const idb = window.indexedDB as any
  const originalOpen = idb.open

  idb.open = function(...args: any[]) {
    let onerror: ((ev: Event) => any) | undefined

    const realRequest = originalOpen.apply(this, args)
    const proxyRequest = new Proxy(realRequest, {
      get(target, prop) {
        if (prop === 'onerror') return onerror
        return target[prop]
      },
      set(target, prop, value) {
        if (prop === 'onerror') {
          onerror = value
          return true
        }
        target[prop] = value
        return true
      },
    })

    realRequest.onerror = event => {
      onAnyError((event.target as any).error, event)
      onerror?.call(proxyRequest, event)
    }

    return proxyRequest
  }
}

export function simulateIndexedDBDelay(minDelayMs = 2000) {
  patchIndexedDBOpen({ delay: minDelayMs })
}
export function simulateIndexedDBUnavailable() {
  patchIndexedDBOpen({
    forceError: () => new DOMException('Simulated IndexedDB unavailable error', 'UnknownError'),
  })
}

export function simulateIndexedDBFailure(minDelayMs = 2000) {
  patchIndexedDBOpen({
    delay: minDelayMs,
    forceError: () => new DOMException('Simulated IndexedDB failure error', 'UnknownError')
  })
}

export function simulateIndexedDBQuotaExceeded() {
  patchIndexedDBOpen({
    delay: 0,
    forceError: () => new DOMException('Simulated quota exceeded', 'QuotaExceededError')
  })
}

/**
 * Completely destroy database, as opposed to watermelon's reset
 * (which merely clears all records but re-initializes the database schema)
 * Haven't encountered live issues related to this yet, but theoretically provides
 * the cleanest slate for a user to recover from schema issues?
 */
export function destroyDatabase(dbName: string, adapter: LokiJSAdapter): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (adapter._driver) {
      // try {
      //   // good manners to clear the cache, even though this adapter will likely be discarded
      //   adapter._clearCachedRecords();
      // } catch (err: unknown) {
      //   SyncTelemetry.getInstance()?.capture(err)
      // }

      try {
        await deleteDatabase(adapter._driver.loki)
        return resolve();
      } catch (err: unknown) {
        SyncTelemetry.getInstance()?.capture(err as Error)
        return reject(err);
      }
    }

    destroyIndexedDBDatabase(dbName).then(() => resolve()).catch((err) => reject(err));
  });
}

function patchIndexedDBOpen({ delay, forceError }: { delay?: number, forceError?: () => void }) {
  const idb = window.indexedDB as any
  const originalOpen = idb.open

  const startTime = Date.now()

  // Wrap open function and proxy success and error handlers
  idb.open = function(...args: any[]) {
    if (forceError && typeof delay === 'undefined') {
      throw forceError()
    }

    let onsuccess: ((ev: Event) => any) | undefined
    let onerror: ((ev: Event) => any) | undefined

    const realRequest = originalOpen.apply(this, args)
    const proxyRequest = new Proxy(realRequest, {
      get(target, prop) {
        if (prop === 'onsuccess') return onsuccess
        if (prop === 'onerror') return onerror
        return target[prop]
      },
      set(target, prop, value) {
        if (prop === 'onsuccess') {
          onsuccess = value
          return true
        }
        if (prop === 'onerror') {
          onerror = value
          return true
        }
        target[prop] = value
        return true
      },
    })

    // trigger success after provided delay, only if no error is forced
    realRequest.onsuccess = event => {
      if (!forceError) {
        setTimeout(() => onsuccess?.call(proxyRequest, event), Math.max(0, delay - (Date.now() - startTime)))
      }
    }

    // force error after provided delay
    if (forceError) {
      setTimeout(() => {
        const error = forceError()
        const event = new Event('error')
        Object.defineProperty(event, 'target', { value: { error } })
        onerror?.call(proxyRequest, event)
      }, Math.max(0, delay - (Date.now() - startTime)))
    }

    return proxyRequest
  }
}

function destroyIndexedDBDatabase(dbName: string) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);

    request.onsuccess = () => resolve();
    request.onblocked = () => {
      reject(new Error(`IndexedDB deletion blocked for "${dbName}"`));
    };
    request.onerror = () => reject(request.error ?? new Error("Manual IndexedDB deletion failed"));
  })
}
