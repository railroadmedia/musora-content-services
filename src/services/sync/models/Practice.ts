import { SYNC_TABLES } from '../schema'
import BaseModel from './Base'
import {
  boolean,
  nullableChar,
  nullableUint,
  nullableUint8,
  nullableVarchar,
  numberInRange,
  string,
  number,
} from '../errors/validators'

export const validators = {
  manual_id: nullableChar(26),
  content_id: nullableUint,
  date: string,
  auto: boolean,
  duration_seconds: numberInRange(0, 59999),
  title: nullableVarchar(64),
  thumbnail_url: nullableVarchar(255),
  category_id: nullableUint8,
  instrument_id: nullableUint8,
}

export default class Practice extends BaseModel<{
  manual_id: string | null
  content_id: number | null
  date: string
  auto: boolean
  duration_seconds: number
  title: string | null
  thumbnail_url: string | null
  category_id: number | null
  instrument_id: number | null
}> {
  static table = SYNC_TABLES.PRACTICES

  get manual_id() {
    return this._getRaw('manual_id') as string | null
  }
  get content_id() {
    return this._getRaw('content_id') as number | null
  }
  get date() {
    return this._getRaw('date') as string
  }
  get auto() {
    return this._getRaw('auto') as boolean
  }
  get duration_seconds() {
    return this._getRaw('duration_seconds') as number
  }
  get title() {
    return this._getRaw('title') as string | null
  }
  get thumbnail_url() {
    return this._getRaw('thumbnail_url') as string | null
  }
  get category_id() {
    return this._getRaw('category_id') as number | null
  }
  get instrument_id() {
    return this._getRaw('instrument_id') as number | null
  }

  set manual_id(value: string | null) {
    this._setRaw('manual_id', validators.manual_id(value))
  }
  set content_id(value: number | null) {
    this._setRaw('content_id', validators.content_id(value))
  }
  set date(value: string) {
    this._setRaw('date', validators.date(value))
  }
  set auto(value: boolean) {
    this._setRaw('auto', validators.auto(value))
  }
  set duration_seconds(value: number) {
    this._setRaw('duration_seconds', validators.duration_seconds(value))
  }
  set title(value: string | null) {
    this._setRaw('title', validators.title(value))
  }
  set thumbnail_url(value: string | null) {
    this._setRaw('thumbnail_url', validators.thumbnail_url(value))
  }
  set category_id(value: number | null) {
    this._setRaw('category_id', validators.category_id(value))
  }
  set instrument_id(value: number | null) {
    this._setRaw('instrument_id', validators.instrument_id(value))
  }

  static generateAutoId(contentId: number, date: string) {
    number(contentId)
    string(date)
    return ['auto', contentId.toString(), date].join(':')
  }

  static generateManualId(manualId: string) {
    string(manualId)
    return `manual:${manualId}`
  }
}
