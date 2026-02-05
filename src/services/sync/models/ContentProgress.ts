import BaseModel from './Base'
import { SYNC_TABLES } from '../schema'
import {
  throwIfInvalidEnumValue,
  throwIfNotNullableNumber,
  throwIfNotNullableInteger,
  throwIfNotNullableString,
  throwIfOutsideRange,
  throwIfNotInteger,
  throwIfNotNumber
} from '../errors/validators'

export enum COLLECTION_TYPE {
  SELF = 'self',
  LEARNING_PATH = 'learning-path-v2',
}
export const COLLECTION_ID_SELF = 0

export enum STATE {
  STARTED = 'started',
  COMPLETED = 'completed'
}

export interface CollectionParameter {
  type: COLLECTION_TYPE,
  id: number,
}

const validators = {
  // unsigned int
  content_id: (contentId: number) => {
    throwIfNotNullableInteger(contentId)
    return throwIfOutsideRange(contentId, 0)
  },
  content_brand: (contentBrand: string | null) => {
    return throwIfNotNullableString(contentBrand)
  },
  // tinyint unsigned - IMPORTANT: progress percent only moves forward and is clamped between 0 and 100
  // also has implications for last-write-wins sync strategy
  progress_percent: (value: number, currentPercent: number) => {
    throwIfNotNumber(value)
    throwIfOutsideRange(value, 0, 100)
    return value === 0 ? 0 : Math.max(value, currentPercent)
  },
  // enum collection_type
  collection_type: (collectionType: string) => {
    return throwIfInvalidEnumValue(collectionType, COLLECTION_TYPE) as COLLECTION_TYPE
  },
  // unsigned mediumint 16777215
  collection_id: (collectionId: number) => {
    throwIfNotInteger(collectionId)
    return throwIfOutsideRange(collectionId, 0, 16777215)
  },
  // smallint unsigned
  resume_time_seconds: (value: number | null) => {
    throwIfNotNullableNumber(value)
    return value !== null ? throwIfOutsideRange(value, 0, 65535) : value
  }
}

export default class ContentProgress extends BaseModel {
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
  get last_interacted_a_la_carte() {
    return this._getRaw('last_interacted_a_la_carte') as number
  }

  set content_id(value: number) {
    this._setRaw('content_id', validators.content_id(value))
  }
  set content_brand(value: string |  null) {
    this._setRaw('content_brand', validators.content_brand(value))
  }
  set progress_percent(value: number) {
    const percent = validators.progress_percent(value, this.progress_percent)

    this._setRaw('progress_percent', percent)
    this._setRaw('state', percent === 100 ? STATE.COMPLETED : STATE.STARTED)
  }
  set collection_type(value: COLLECTION_TYPE) {
    this._setRaw('collection_type', validators.collection_type(value))
  }
  set collection_id(value: number) {
    this._setRaw('collection_id', validators.collection_id(value))
  }
  set resume_time_seconds(value: number | null) {
    this._setRaw('resume_time_seconds', validators.resume_time_seconds(value))
  }
  set last_interacted_a_la_carte(value: number) {
    this._setRaw('last_interacted_a_la_carte', value)
  }

  static generateId(
    contentId: number,
    collection: CollectionParameter | null
  ) {
    validators.content_id(contentId)

    if (collection !== null) {
      validators.collection_type(collection.type)
      validators.collection_id(collection.id)
    }

    return `${contentId}:${collection?.type || COLLECTION_TYPE.SELF}:${collection?.id || COLLECTION_ID_SELF}`
  }
}
