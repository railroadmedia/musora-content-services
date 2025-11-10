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
  collection_type: COLLECTION_TYPE | null
  collection_id: number | null
  state: STATE
  progress_percent: number
  resume_time_seconds: number
}> {
  static table = SYNC_TABLES.CONTENT_PROGRESS

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
  set resume_time_seconds(value: number) {
    this._setRaw('resume_time_seconds', value)
  }

}
