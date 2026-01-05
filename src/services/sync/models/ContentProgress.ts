import BaseModel from './Base'
import { SYNC_TABLES } from '../schema'
import {
  throwIfInvalidEnumValue,
  throwIfNotNullableNumber,
  throwIfNotNullableString,
  throwIfNotNumber,
  throwIfOutsideRange,
} from '../errors/validators'

export enum COLLECTION_TYPE {
  SELF = 'self',
  GUIDED_COURSE = 'guided-course',
  LEARNING_PATH = 'learning-path-v2',
  PLAYLIST = 'playlist',
}
export const COLLECTION_ID_SELF = 0

export enum STATE {
  STARTED = 'started',
  COMPLETED = 'completed'
}

export default class ContentProgress extends BaseModel<{
  content_id: number
  content_brand: string | null
  collection_type: COLLECTION_TYPE
  collection_id: number
  state: STATE
  progress_percent: number
  resume_time_seconds: number | null
}> {
  static table = SYNC_TABLES.CONTENT_PROGRESS

  get content_id() {
    return this._getRaw('content_id') as number
  }
  get content_brand() {
    return this._getRaw('content_brand') as string | null
  }
  get state() {
    return this._getRaw('state') as STATE
  }
  get progress_percent() {
    return this._getRaw('progress_percent') as number
  }
  get collection_type() {
    return this._getRaw('collection_type') as COLLECTION_TYPE
  }
  get collection_id() {
    return this._getRaw('collection_id') as number
  }
  get resume_time_seconds() {
    return (this._getRaw('resume_time_seconds') as number) || null
  }
  get hide_from_progress_row() {
    return this._getRaw('hide_from_progress_row') as boolean
  }

  set content_id(value: number) {
    // unsigned int
    throwIfNotNumber(value)
    this._setRaw('content_id', throwIfOutsideRange(value, 0))
  }
  set content_brand(value: string |  null) {
    this._setRaw('content_brand', throwIfNotNullableString(value))
  }
  // IMPORTANT: progress percent only moves forward and is clamped between 0 and 100
  // also has implications for last-write-wins sync strategy
  set progress_percent(value: number) {
    // tinyint unsigned
    throwIfNotNumber(value)
    throwIfOutsideRange(value, 0, 100)
    const percent = value === 0 ? 0 : Math.max(value, this.progress_percent)

    this._setRaw('progress_percent', percent)
    this._setRaw('state', percent === 100 ? STATE.COMPLETED : STATE.STARTED)
  }
  set collection_type(value: COLLECTION_TYPE) {
    // enum collection_type
    this._setRaw('collection_type', throwIfInvalidEnumValue(value, COLLECTION_TYPE))
  }
  set collection_id(value: number) {
    // unsigned mediumint 16777215
    throwIfNotNumber(value)
    this._setRaw('collection_id', throwIfOutsideRange(value, 0, 16777215))
  }
  set resume_time_seconds(value: number | null) {
    // smallint unsigned
    throwIfNotNullableNumber(value)
    this._setRaw('resume_time_seconds', value !== null ? throwIfOutsideRange(value, 0, 65535) : value)
  }
  set hide_from_progress_row(value: boolean) {
    this._setRaw('hide_from_progress_row', value)
  }

}
