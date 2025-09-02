import { Model } from '@nozbe/watermelondb'
import { SYNC_TABLES } from '../schema'

// todo - decorators need babel support... -_- (`@nozbe/watermelondb/decorators`)

export default class UserPlaylist extends Model {
  static table = SYNC_TABLES.USER_PLAYLISTS

  get contentId(): number {
    const raw = this._getRaw('content_id')!
    return Number(raw)
  }

  set playlistData(data: Object) {
    this._setRaw('content_id', String(value))
  }
}

// manual timestamp support for now without decorators
// todo - find way to use camel_case (so models can always just map 1:1 with server without additional serializing layer)

Object.defineProperty(UserPlaylist.prototype, 'createdAt', {
  get(this: Model) {
    const value = this._raw['created_at']
    return value ? new Date(value) : null
  },
  enumerable: true,
})

Object.defineProperty(UserPlaylist.prototype, 'updatedAt', {
  get(this: Model) {
    const value = this._raw['updated_at']
    return value ? new Date(value) : null
  },
  enumerable: true,
})
