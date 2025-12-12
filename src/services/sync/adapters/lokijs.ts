// import Loki from 'lokijs'
// import LokiIndexedAdapter from 'lokijs/src/loki-indexed-adapter'

import { SyncTelemetry } from '../telemetry'

import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
export { LokiJSAdapter as default }

import { deleteDatabase } from '@nozbe/watermelondb/adapters/lokijs/worker/lokiExtensions'

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
        SyncTelemetry.getInstance()?.capture(err)
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
