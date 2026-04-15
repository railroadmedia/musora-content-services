import { appSchema, tableSchema } from '@nozbe/watermelondb'
import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import BaseModel from '../../../../src/services/sync/models/Base'

export const TEST_TABLE = 'test_items'

export const testSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: TEST_TABLE,
      columns: [
        { name: 'server_record_id', type: 'number' },
        { name: 'value', type: 'string' },
        { name: 'score', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
})

export default class TestModel extends BaseModel {
  static table = TEST_TABLE

  get value() { return this._getRaw('value') as string }
  get score() { return this._getRaw('score') as number }

  set value(v: string) { this._setRaw('value', v) }
  set score(v: number) { this._setRaw('score', v) }
}

export function makeTestDatabase(opts: { useIncrementalIndexedDB?: boolean; dbName?: string } = {}) {
  const adapter = new LokiJSAdapter({
    schema: testSchema,
    useWebWorker: false,
    useIncrementalIndexedDB: opts.useIncrementalIndexedDB ?? false,
    dbName: opts.dbName ?? `test_store_${Date.now()}_${Math.random()}`,
    extraLokiOptions: { autosave: false },
  })

  return new Database({ adapter, modelClasses: [TestModel] })
}
