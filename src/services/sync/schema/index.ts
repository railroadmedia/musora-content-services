import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const SYNC_TABLES = {
  CONTENT_LIKES: 'content_likes',
  CONTENT_PROGRESS: 'progress',
  PRACTICES: 'practices',
  PRACTICE_DAY_NOTES: 'practice_day_notes'
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
const practicesTable = tableSchema({
  name: SYNC_TABLES.PRACTICES,
  columns: [
    { name: 'manual_id', type: 'string', isOptional: true },
    { name: 'content_id', type: 'number', isOptional: true, isIndexed: true },
    { name: 'day', type: 'string', isIndexed: true },
    { name: 'auto', type: 'boolean', isIndexed: true },
    { name: 'duration_seconds', type: 'number' },
    { name: 'title', type: 'string', isOptional: true },
    { name: 'thumbnail_url', type: 'string', isOptional: true },
    { name: 'category_id', type: 'number', isOptional: true },
    { name: 'instrument_id', type: 'number', isOptional: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number', isIndexed: true }
  ]
})
const practiceDayNotesTable = tableSchema({
  name: SYNC_TABLES.PRACTICE_DAY_NOTES,
  columns: [
    { name: 'date', type: 'string', isIndexed: true },
    { name: 'notes', type: 'string' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number', isIndexed: true }
  ]
})

export default appSchema({
  version: 1,
  tables: [
    contentLikesTable,
    contentProgressTable,
    practicesTable,
    practiceDayNotesTable
  ]
})
