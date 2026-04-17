import { SyncTelemetry } from '../telemetry'

import _LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'

import { deleteDatabase, lokiFatalError } from '@nozbe/watermelondb/adapters/lokijs/worker/lokiExtensions'

// Handle CJS/ESM interop: in Node.js ESM the default import is the exports object
const LokiJSAdapter = (_LokiJSAdapter as any).default ?? _LokiJSAdapter

export type LokiExtensions = {
  onPersistenceError?: (err: Error) => void
}

export default class LokiPersistenceErrorAwareAdapter extends (LokiJSAdapter as typeof _LokiJSAdapter) {
  constructor(options: any, extensions: LokiExtensions = {}) {
    super(options);
    const that = this;

    // Schedule save override right at end of setup hook right after `_driver` is ready
    const setupDispatchCallback = this._dispatcher._pendingCalls[0].callback;
    this._dispatcher._pendingCalls[0].callback = function() {
      that._overrideSaveDatabase(extensions.onPersistenceError);
      setupDispatchCallback.apply(that, arguments);
    }
  }

  _overrideSaveDatabase(onPersistenceError?: (err: Error) => void) {
    const driver = this._driver
    const persistenceAdapter = driver.loki.persistenceAdapter
    const oldSaveDatabase = persistenceAdapter.saveDatabase;

    persistenceAdapter.saveDatabase = function(...args: any[]) {
      const callback = args[2];
      oldSaveDatabase.call(persistenceAdapter, args[0], args[1], function(err: Error | null) {
        if (err && err.name === 'InvalidStateError' && err.message.includes('database connection is closing')) {
          // triggers new connection on next save
          if (persistenceAdapter.idb && !persistenceAdapter.idb._disableReconnect) {
            persistenceAdapter.idb.close()
            persistenceAdapter.idb = null
          }

          // retry once
          oldSaveDatabase.call(persistenceAdapter, args[0], args[1], function(err: Error | null) {
            if (err && err.name === 'InvalidStateError' && err.message.includes('database connection is closing')) {
              // Don't set _isBroken - that prevents us from being to trigger onPersistenceError in the future
              // driver._isBroken = true

              onPersistenceError?.(err)
            }

            callback(err);
          })

          return
        }

        callback(err);
      })
    }
  }
}

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
 * Patch indexedDB.deleteDatabase to delay the real call by 1ms
 * as Safari logs tons of noisy errors, due to watermelon's
 * `IncrementalIndexedDBAdapter.prototype.deleteDatabase` fn not waiting for
 * a `close()` call to complete before trying `deleteDatabase`
 * (which consistently triggers `request.onblocked`)
 */
export function patchIndexedDBDeleteDatabaseErrors() {
  const idb = window.indexedDB as any
  const originalDeleteDatabase = idb.deleteDatabase

  idb.deleteDatabase = function(...args: any[]) {
    const proxyRequest = new Proxy({} as IDBOpenDBRequest, {
      get(target, prop) {
        return target[prop]
      },
      set(target, prop, value) {
        target[prop] = value
        return true
      },
    })

    // Delay the real call by 1ms
    setTimeout(() => {
      const realRequest = originalDeleteDatabase.apply(this, args)

      Object.keys(proxyRequest).forEach(prop => {
        realRequest[prop] = (event: Event) => proxyRequest[prop]?.call(proxyRequest, event)
      })
    }, 1)

    return proxyRequest
  }
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

export function abortWritesToDatabase(adapter: typeof LokiJSAdapter) {
  // acts as handy helper to disable loki's save methods entirely
  lokiFatalError(adapter._driver.loki)
  return Promise.resolve()
}

/**
 * Completely destroy database, as opposed to watermelon's reset
 * (which merely clears all records but re-initializes the database schema)
 * Haven't encountered live issues related to this yet, but theoretically provides
 * the cleanest slate for a user to recover from schema issues?
 */
export function destroyDatabase(dbName: string, adapter: typeof LokiJSAdapter): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (adapter._driver) {
      try {
        // good manners to clear the cache, even though this adapter will likely be discarded
        adapter._clearCachedRecords();
      } catch (err: unknown) {
        SyncTelemetry.getInstance()?.capture(err)
      }

      try {
        await deleteDatabase(adapter._driver.loki)
        return resolve();
      } catch (err: unknown) {
        SyncTelemetry.getInstance()?.capture(err)
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
