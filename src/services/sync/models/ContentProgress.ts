import BaseModel from './Base'
import { SYNC_TABLES } from '../schema'

export enum COLLECTION_TYPE {
  LEARNING_PATH = 'learning-path',
}

export enum STATE {
  STARTED = 'started',
  COMPLETED = 'completed'
}

export default class ContentProgress extends BaseModel<{
  content_id: number
  state: STATE
  progress_percent: number
  collection_type: COLLECTION_TYPE | null
  collection_id: number | null
  brand: string
}> {
  static table = SYNC_TABLES.CONTENT_PROGRESS

  // todo add resume_time
  // todo add brand, synced from railcontent_content's brand field (maybe status too while we're at it?)

  get content_id() {
    return this._getRaw('content_id') as number
  }
  get state() {
    return this._getRaw('state') as STATE
  }
  get progress_percent() {
    return this._getRaw('progress_percent') as number
  }
  get collection_type() {
    return (this._getRaw('collection_type') as COLLECTION_TYPE) || null
  }
  get collection_id() {
    return (this._getRaw('collection_id') as number) || null
  }
  get brand() {
    return this._getRaw('brand') as string
  }

  set content_id(value: number) {
    this._setRaw('content_id', value)
  }
  set state(value: STATE) {
    this._setRaw('state', value)
  }
  set progress_percent(value: number) {
    this._setRaw('progress_percent', value)
  }
  set collection_type(value: COLLECTION_TYPE | null) {
    this._setRaw('collection_type', value)
  }
  set collection_id(value: number | null) {
    this._setRaw('collection_id', value)
  }
  set brand(value: string) {
    this._setRaw('brand', value)
  }


}
