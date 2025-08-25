import { Model } from '@nozbe/watermelondb'
import { SYNC_TABLES } from '../schema'

// todo - decorators need babel support... -_- (`@nozbe/watermelondb/decorators`)

export default class ContentLike extends Model {
  static table = SYNC_TABLES.CONTENT_LIKES

  get content_id(): number | null {
    const raw = this._getRaw('content_id')
    return raw ? Number(raw) : null
  }

  set content_id(value: number) {
    this._setRaw('content_id', String(value))
  }
}

// manual timestamp support for now without decorators
// todo - find way to use camel_case (so models can always just map 1:1 with server without additional serializing layer)

Object.defineProperty(ContentLike.prototype, 'createdAt', {
  get(this: Model) {
    const value = this._raw.created_at
    return value ? new Date(value) : null
  },
  enumerable: true,
})

Object.defineProperty(ContentLike.prototype, 'updatedAt', {
  get(this: Model) {
    const value = this._raw.updated_at
    return value ? new Date(value) : null
  },
  enumerable: true,
})
