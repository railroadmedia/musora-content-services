import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'practices',
          columns: [
            { name: 'session_duration_seconds', type: 'string' },
            { name: 'duration_seconds_override', type: 'number', isOptional: true }
          ]
        })
      ]
    }
  ]
})
