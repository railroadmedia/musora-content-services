import { SyncTelemetry } from '../telemetry'

import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
export { LokiJSAdapter as default }

import { deleteDatabase } from '@nozbe/watermelondb/adapters/lokijs/worker/lokiExtensions'

export function simulateIndexedDBUnavailable() {
  const idb = window.indexedDB;
  ['open', 'databases'].forEach(function (method) {
    if (typeof (idb as any)[method] === 'function') {
      (idb as any)[method] = function () {
        throw new Error('Simulated unavailability of IndexedDB')
      }
    }
  })
}

export function simulateIndexedDBQuotaExceeded() {
  const origOpen = indexedDB.open
  indexedDB.open = function (...args) {
    const request = origOpen.apply(this, args)
    setTimeout(() => {
      const err = new DOMException('Simulated quota exceeded', 'QuotaExceededError');
      (request.onerror as any)?.({ target: { ...request, error: err } });
    }, 0)
    return request
  }
}

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
