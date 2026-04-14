import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations'
import { SYNC_TABLES } from './index'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: SYNC_TABLES.PRACTICES,
          columns: [
            { name: 'session_id', type: 'string', isOptional: true }
          ]
        })
      ]
    }
  ]
})
