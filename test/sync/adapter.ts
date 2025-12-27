import adapterFactory from '../../src/services/sync/adapters/factory'
import LokiJSAdapter from '../../src/services/sync/adapters/lokijs'

export default function syncStoreAdapter(userId: string) {
  return adapterFactory(LokiJSAdapter, `user:${userId}`, {
    useWebWorker: false,
    useIncrementalIndexedDB: true
  })
}
