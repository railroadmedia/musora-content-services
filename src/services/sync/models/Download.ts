import { Model } from '@nozbe/watermelondb'
import { SYNC_TABLES } from '../schema'

// todo - decorators need babel support... -_- (`@nozbe/watermelondb/decorators`)

export default class Download extends Model {
  static table = SYNC_TABLES.DOWNLOADS

  set parentId(value: string) {
    this._setRaw('parent_id', String(value))
  }
  set type(value: string) {
    this._setRaw('type', String(value))
  }
  set playlistResource(value: string) {
    this._setRaw('playlist_resource', String(value))
  }
  set isDownloadsCollection(value: boolean) {
    this._setRaw('is_downloads_collection', String(value))
  }
}

// manual timestamp support for now without decorators
// todo - find way to use camel_case (so models can always just map 1:1 with server without additional serializing layer)

Object.defineProperty(Download.prototype, 'createdAt', {
  get(this: Model) {
    const value = this._raw['created_at']
    return value ? new Date(value) : null
  },
  enumerable: true,
})

Object.defineProperty(Download.prototype, 'updatedAt', {
  get(this: Model) {
    const value = this._raw['updated_at']
    return value ? new Date(value) : null
  },
  enumerable: true,
})
