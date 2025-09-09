import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const SYNC_TABLES = {
  CONTENT_LIKES: 'content_likes',
  CONTENT_PROGRESS: 'progress',
  CONTENT_PRACTICES: 'practice',
  DOWNLOADS: 'playlists'
}

const contentLikesTable = tableSchema({
  name: SYNC_TABLES.CONTENT_LIKES,
  columns: [
    { name: 'content_id', type: 'string' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' }
  ]
})
const contentProgressTable = tableSchema({
  name: SYNC_TABLES.CONTENT_PROGRESS,
  columns: [
    { name: 'content_id', type: 'string' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' }
  ]
})
const contentPracticesTable = tableSchema({
  name: SYNC_TABLES.CONTENT_PRACTICES,
  columns: [
    { name: 'content_id', type: 'string' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' }
  ]
})
const downloadsTable = tableSchema({
  name: SYNC_TABLES.DOWNLOADS,
  columns: [
    { name: 'parent_id', type: 'string' },
    { name: 'type', type: 'string' },
    { name: 'is_downloads_collection', type: 'boolean' },
    { name: 'playlist_resource', type: 'string' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' }
  ]
})

export default appSchema({
  version: 1,
  tables: [
    contentLikesTable,
    contentProgressTable,
    contentPracticesTable,
    downloadsTable
  ]
})
