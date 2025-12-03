import BaseModel from './Base'
import { SYNC_TABLES } from '../schema'

export enum COLLECTION_TYPE {
  SKILL_PACK = 'skill-pack',
  LEARNING_PATH = 'learning-path-v2',
  PLAYLIST = 'playlist',
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
  resume_time_seconds: number | null
}> {
  static table = SYNC_TABLES.CONTENT_PROGRESS

  get content_id() {
    return this._getRaw('content_id') as number
  }
  get content_brand() {
    return this._getRaw('content_brand') as string
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
  get resume_time_seconds() {
    return (this._getRaw('resume_time_seconds') as number) || null
  }

  set content_id(value: number) {
    this._setRaw('content_id', value)
  }
  set content_brand(value: string) {
    this._setRaw('content_brand', value)
  }
  set state(value: STATE) {
    this._setRaw('state', value)
  }
  set progress_percent(value: number) {
    this._setRaw('progress_percent', Math.min(100, Math.max(0, value)))
  }
  set collection_type(value: COLLECTION_TYPE | null) {
    this._setRaw('collection_type', value)
  }
  set collection_id(value: number | null) {
    this._setRaw('collection_id', value)
  }
  set resume_time_seconds(value: number | null) {
    this._setRaw('resume_time_seconds', value !== null ? Math.max(0, value) : null)
  }

}
