import { SYNC_TABLES } from '../schema'
import BaseModel from './Base'
import {
  throwIfMaxLengthExceeded,
  throwIfNotBoolean,
  throwIfNotNullableNumber,
  throwIfNotNullableString,
  throwIfNotNumber,
  throwIfNotString, throwIfOutsideRange,
} from '../errors/validators'

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
    // char(26)
    throwIfNotNullableString(value)
    this._setRaw('manual_id', value !== null ? throwIfMaxLengthExceeded(value, 26) : value)
  }
  set content_id(value: number | null) {
    // int unsigned
    throwIfNotNullableNumber(value)
    this._setRaw('content_id', value !== null ? throwIfOutsideRange(value, 0) : value)
  }
  set date(value: string) {
    this._setRaw('date', throwIfNotString(value))
  }
  set auto(value: boolean) {
    // tinyint(1)
    this._setRaw('auto', throwIfNotBoolean(value))
  }
  set duration_seconds(value: number) {
    throwIfNotNumber(value)
    this._setRaw('duration_seconds', throwIfOutsideRange(value, 0, 59999))
  }
  set title(value: string | null) {
    // varchar(64)
    throwIfNotNullableString(value)
    this._setRaw('title', value !== null ? throwIfMaxLengthExceeded(value, 64) : value)
  }
  set thumbnail_url(value: string | null) {
    // varchar(255)
    throwIfNotNullableString(value)
    this._setRaw('thumbnail_url', value !== null ? throwIfMaxLengthExceeded(value, 255) : value)
  }
  set category_id(value: number | null) {
    // tinyint unsigned
    throwIfNotNullableNumber(value)
    this._setRaw('category_id', value !== null ? throwIfOutsideRange(value, 0, 255) : value)
  }
  set instrument_id(value: number | null) {
    // tinyint unsigned
    throwIfNotNullableNumber(value)
    this._setRaw('instrument_id', value !== null ? throwIfOutsideRange(value, 0, 255) : value)
  }
}
