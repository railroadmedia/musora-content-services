import adapterFactory from '../src/services/sync/adapters/factory'
import LokiJSAdapter from '../src/services/sync/adapters/lokijs'
import EventEmitter from '../src/services/sync/utils/event-emitter'

export default function syncStoreAdapter(userId: string, bus: SyncAdapterEventBus) {
  return adapterFactory(LokiJSAdapter, `user:${userId}`, {
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    extraLokiOptions: {
      autosave: true,
      autosaveInterval: 300, // increase for better performance at cost of potential data loss on tab close/crash
    },
    onQuotaExceededError: () => {
      // Browser ran out of disk space or possibly in incognito mode
      // called ONLY at startup
      // ideal place to trigger banner (?) to user when also offline?
      // (so that the non-customizable browser default onbeforeunload confirmation (in offline-unload-warning.ts) has context and makes sense)
      bus.emit('quotaExceededError')
    },
    onSetUpError: () => {
      // TODO - Database failed to load -- offer the user to reload the app or log out
    },
    extraIncrementalIDBOptions: {
      lazyCollections: ['content_like'],
      onDidOverwrite: () => {
        // Called when this adapter is forced to overwrite contents of IndexedDB.
        // This happens if there's another open tab of the same app that's making changes.
        // this scenario is handled-ish in `idb-clobber-avoidance`
      },
      onversionchange: () => {
        // no-op
        // indexeddb was deleted in another browser tab (user logged out), so we must make sure we delete
        // in-memory db in this tab as well,
        // but we rely on sync manager setup/teardown to `unsafeResetDatabase` and redirect for this,
        // though reloading the page might be useful as well
      },
    },
  })
}

export class SyncAdapterEventBus extends EventEmitter<{ quotaExceededError: [] }> {}
