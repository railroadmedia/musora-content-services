import BaseModel from './Base'
import { SYNC_TABLES } from '../schema'
import { enumValue, mediumint, nullableUint16, percent, positiveInt, string, uint32 } from '../errors/validators'

export enum COLLECTION_TYPE {
  SELF = 'self',
  LEARNING_PATH = 'learning-path-v2',
  PLAYLIST = 'playlist',
}

export const COLLECTION_ID_SELF = 0

export const PARENT_ID_TOP_LEVEL = 0

export enum STATE {
  STARTED = 'started',
  COMPLETED = 'completed'
}

export interface CollectionParameter {
  type: COLLECTION_TYPE,
  id: number,
}

const validators = {
  content_id: positiveInt,
  content_brand: string,
  content_type: string,
  content_parent_id: uint32,
  progress_percent: (value: number, currentPercent: number) => {
    const validated = percent(value)
    return validated === 0 ? 0 : Math.max(validated, currentPercent)
  },
  collection_type: enumValue(COLLECTION_TYPE),
  collection_id: mediumint,
  resume_time_seconds: nullableUint16,
}

export default class ContentProgress extends BaseModel {
  static table = SYNC_TABLES.CONTENT_PROGRESS

  get content_id() {
    return this._getRaw('content_id') as number
  }

  set content_id(value: number) {
    this._setRaw('content_id', validators.content_id(value))
  }

  get content_brand() {
    return this._getRaw('content_brand') as string
  }

  set content_brand(value: string) {
    this._setRaw('content_brand', validators.content_brand(value))
  }

  get content_type() {
    return this._getRaw('content_type') as string
  }

  set content_type(value: string) {
    this._setRaw('content_type', validators.content_type(value))
  }

  get content_parent_id() {
    return this._getRaw('content_parent_id') as number
  }

  set content_parent_id(value: number) {
    this._setRaw('content_parent_id', validators.content_parent_id(value))
  }

  get state() {
    return this._getRaw('state') as STATE
  }

  get progress_percent() {
    return this._getRaw('progress_percent') as number
  }

  set progress_percent(value: number) {
    const percent = validators.progress_percent(value, this.progress_percent)

    this._setRaw('progress_percent', percent)
    this._setRaw('state', percent === 100 ? STATE.COMPLETED : STATE.STARTED)
  }

  get collection_type() {
    return this._getRaw('collection_type') as COLLECTION_TYPE
  }

  set collection_type(value: COLLECTION_TYPE) {
    this._setRaw('collection_type', validators.collection_type(value))
  }

  get collection_id() {
    return this._getRaw('collection_id') as number
  }

  set collection_id(value: number) {
    this._setRaw('collection_id', validators.collection_id(value))
  }

  get resume_time_seconds() {
    return this._getRaw('resume_time_seconds') as number | null
  }

  set resume_time_seconds(value: number | null) {
    this._setRaw('resume_time_seconds', validators.resume_time_seconds(value))
  }

  get last_interacted_a_la_carte() {
    return this._getRaw('last_interacted_a_la_carte') as number
  }

  set last_interacted_a_la_carte(value: number) {
    this._setRaw('last_interacted_a_la_carte', value)
  }

  static generateId(
    contentId: number,
    collection: CollectionParameter | null,
  ) {
    validators.content_id(contentId)

    if (collection !== null) {
      validators.collection_type(collection.type)
      validators.collection_id(collection.id)
    }

    return `${contentId}:${collection?.type || COLLECTION_TYPE.SELF}:${collection?.id || COLLECTION_ID_SELF}`
  }

  setProgressForceRegression(value: number) {
    const validated = percent(value)
    this._setRaw('progress_percent', validated)
    this._setRaw('state', validated === 100 ? STATE.COMPLETED : STATE.STARTED)
  }
}
