import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations'
import { SYNC_TABLES, default as schema } from '../schema'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: SYNC_TABLES.CONTENT_PROGRESS,
          columns: [
            schema.tables[SYNC_TABLES.CONTENT_PROGRESS].columns.foo
          ],
        }),
      ],
    },
  ],
})

