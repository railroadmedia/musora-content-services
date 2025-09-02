import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const SYNC_TABLES = {
  CONTENT_LIKES: 'content_likes',
  CONTENT_PROGRESS: 'progress',
  CONTENT_PRACTICES: 'practice',
  USER_PLAYLISTS: 'playlists'
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
const userPlaylistsTable = tableSchema({
  name: SYNC_TABLES.USER_PLAYLISTS,
  columns: [
    { name: 'playlist_id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'category', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'duration', type: 'number' },
    { name: 'is_downloads_collection', type: 'boolean' },
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
    userPlaylistsTable
  ]
})
