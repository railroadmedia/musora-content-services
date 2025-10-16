import { SYNC_TABLES } from '../schema'
import BaseModel from './Base'

export default class ContentLike extends BaseModel {
  static table = SYNC_TABLES.CONTENT_LIKES

  get content_id() {
    return this._getRaw('content_id') as number
  }

  set content_id(value: number) {
    this._setRaw('content_id', value)
  }
}
