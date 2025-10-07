import BaseModel from './Base'
import { SYNC_TABLES } from '../schema'

export default class ContentProgress extends BaseModel {
  static table = SYNC_TABLES.CONTENT_PROGRESS


  get content_id() {
    return this._getRaw('content_id') as number
  }
  get state() {
    return this._getRaw('state') as string
  }
  get progress_percent() {
    return this._getRaw('progress_percent') as number
  }
  get parent_type() {
    return this._getRaw('parent_type') as number
  }
  get parent_id() {
    return this._getRaw('parent_id') as number
  }
  get brand() {
    return this._getRaw('brand') as string
  }

  set content_id(value: number) {
    this._setRaw('content_id', value)
  }
  set state(value: string) {
    this._setRaw('state', value)
  }
  set progress_percent(value: number) {
    this._setRaw('progress_percent', value)
  }
  set parent_type(value: number) {
    this._setRaw('parent_type', value)
  }
  set parent_id(value: number) {
    this._setRaw('parent_id', value)
  }
  set brand(value: string) {
    this._setRaw('brand', value)
  }


}
