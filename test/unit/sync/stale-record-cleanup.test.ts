import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import schema, { SYNC_TABLES } from '@/services/sync/schema/index'
import * as modelClasses from '@/services/sync/models/index'
import { makeStore } from './helpers/index'
import { repairStaleSyncedRecords } from '@/services/sync/stale-record-cleanup'
import * as HttpClient from '@/infrastructure/http/HttpClient'

function makeDatabase() {
  const adapter = new LokiJSAdapter({
    schema,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `test_stale_${Date.now()}_${Math.random()}`,
    extraLokiOptions: { autosave: false },
  })
  return new Database({ adapter, modelClasses: Object.values(modelClasses) })
}

let db: Database
let postMock: jest.SpyInstance

beforeEach(() => {
  db = makeDatabase()
  postMock = jest.spyOn(HttpClient, 'POST').mockResolvedValue({})
})

afterEach(async () => {
  await db.write(() => db.unsafeResetDatabase())
  jest.restoreAllMocks()
})

test('marks stale synced records as updated when server has older updated_at', async () => {
  const { store } = makeStore(modelClasses.ContentProgress, db)

  const localUpdatedAt = Date.now() - 60_000
  const serverUpdatedAt = localUpdatedAt - 5_000 // server is behind

  await store.importUpsert([
    {
      id: 'stale-1',
      server_record_id: 0,
      content_id: 123,
      content_brand: 'drumeo',
      content_type: 'lesson',
      content_parent_id: 0,
      state: 'started',
      progress_percent: 50,
      collection_type: 'self',
      collection_id: 0,
      resume_time_seconds: null,
      last_interacted_a_la_carte: 0,
      created_at: localUpdatedAt,
      updated_at: localUpdatedAt,
      _status: 'synced',
      _changed: '',
    } as any,
  ])

  postMock.mockResolvedValue({
    [SYNC_TABLES.CONTENT_PROGRESS]: [['stale-1', serverUpdatedAt]],
  })

  const storesRegistry = { [SYNC_TABLES.CONTENT_PROGRESS]: store }
  await repairStaleSyncedRecords(storesRegistry)

  const record = await db.read(() => db.get(SYNC_TABLES.CONTENT_PROGRESS).find('stale-1')) as any
  store.destroy()

  expect(record._raw._status).toBe('updated')
})

test('leaves records unchanged when server finds no stale entries', async () => {
  const { store } = makeStore(modelClasses.ContentProgress, db)

  const updatedAt = Date.now() - 60_000
  await store.importUpsert([
    {
      id: 'fine-1',
      server_record_id: 0,
      content_id: 456,
      content_brand: 'drumeo',
      content_type: 'lesson',
      content_parent_id: 0,
      state: 'started',
      progress_percent: 10,
      collection_type: 'self',
      collection_id: 0,
      resume_time_seconds: null,
      last_interacted_a_la_carte: 0,
      created_at: updatedAt,
      updated_at: updatedAt,
      _status: 'synced',
      _changed: '',
    } as any,
  ])

  postMock.mockResolvedValue({})

  const storesRegistry = { [SYNC_TABLES.CONTENT_PROGRESS]: store }
  await repairStaleSyncedRecords(storesRegistry)

  const record = await db.read(() => db.get(SYNC_TABLES.CONTENT_PROGRESS).find('fine-1')) as any
  store.destroy()

  expect(record._raw._status).toBe('synced')
})
