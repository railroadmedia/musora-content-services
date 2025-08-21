import { Model } from '@nozbe/watermelondb'
import { SYNC_TABLES } from '../schema'

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
