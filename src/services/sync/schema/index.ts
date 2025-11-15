import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const SYNC_TABLES = {
  CONTENT_LIKES: 'content_likes',
  CONTENT_PROGRESS: 'progress',
  CONTENT_PRACTICES: 'practice'
}

const contentLikesTable = tableSchema({
  name: SYNC_TABLES.CONTENT_LIKES,
  columns: [
    { name: 'content_id', type: 'number', isIndexed: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' }
  ]
})
const contentProgressTable = tableSchema({
  name: SYNC_TABLES.CONTENT_PROGRESS,
  columns: [
    { name: 'content_id', type: 'number', isIndexed: true },
    { name: 'content_brand', type: 'string', isIndexed: true },
    { name: 'collection_type', type: 'string', isOptional: true, isIndexed: true },
    { name: 'collection_id', type: 'number', isOptional: true, isIndexed: true },
    { name: 'state', type: 'string', isIndexed: true },
    { name: 'progress_percent', type: 'number' },
    { name: 'resume_time_seconds', type: 'number' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number', isIndexed: true }
  ]
})
const contentPracticesTable = tableSchema({
  name: SYNC_TABLES.CONTENT_PRACTICES,
  columns: [
    { name: 'content_id', type: 'number', isIndexed: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' }
  ]
})

export default appSchema({
  version: 1,
  tables: [
    contentLikesTable,
    contentProgressTable,
    contentPracticesTable
  ]
})
