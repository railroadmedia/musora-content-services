import { SYNC_TABLES } from '../schema'
import BaseModel from './Base'
import { throwIfNotNumber } from '../errors/validators'

export default class ContentLike extends BaseModel<{
  content_id: number
}> {
  static table = SYNC_TABLES.CONTENT_LIKES

  get content_id() {
    return this._getRaw('content_id') as number
  }

  set content_id(value: number) {
    this._setRaw('content_id', throwIfNotNumber(value))
  }

  static generateId(contentId: number) {
    throwIfNotNumber(contentId)
    return contentId.toString()
  }
}
