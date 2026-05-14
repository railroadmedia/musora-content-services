import { SYNC_TABLES } from '../schema'
import BaseModel from './Base'
import RawSerializer from '../serializers/raw'
import * as v from 'valibot'
import {
  boolean,
  nullableChar,
  nullableUint,
  nullableUint8,
  nullableVarchar,
  numberInRange,
  record,
  string,
  number,
} from '../errors/validators'

export const validators = {
  manual_id: nullableChar(26),/*  */
  content_id: nullableUint,
  date: string,
  auto: boolean,
  duration_seconds: numberInRange(0, 59999),
  session_duration_seconds: record(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(59999))),
  duration_seconds_override: (v: unknown) => v === null ? null : numberInRange(0, 59999)(v),
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
  session_duration_seconds: Record<string, number>
  duration_seconds_override: number | null
  title: string | null
  thumbnail_url: string | null
  category_id: number | null
  instrument_id: number | null
}> {
  static table = SYNC_TABLES.PRACTICES
  static serializer = RawSerializer.withJsonColumns(['session_duration_seconds'])

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
  get session_duration_seconds(): Record<string, number> {
    const raw = this._getRaw('session_duration_seconds') as string | null
    if (!raw) return {}
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  get duration_seconds_override() {
    return this._getRaw('duration_seconds_override') as number | null
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
    if (this._getRaw('auto')) {
      const val = validators.duration_seconds_override(value)
      this._setRaw('duration_seconds_override', val)
      this._setRaw('duration_seconds', !val ? Practice._countSessionDurationSeconds(this.session_duration_seconds) : val)


    } else {
      this._setRaw('duration_seconds', validators.duration_seconds(value))
    }
  }
  set session_duration_seconds(value: Record<string, number>) {
    if (this._getRaw('auto')) {
      this._setRaw('session_duration_seconds', JSON.stringify(validators.session_duration_seconds(value)))
      this._setRaw('duration_seconds', !this._getRaw('duration_seconds_override') ? Practice._countSessionDurationSeconds(value) : this._getRaw('duration_seconds_override'))
    }
  }
  set duration_seconds_override(value: number | null) {
    if (this._getRaw('auto')) {
      this._setRaw('duration_seconds_override', validators.duration_seconds_override(value))
      this._setRaw('duration_seconds', !value ? Practice._countSessionDurationSeconds(this.session_duration_seconds) : value)
    }
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

  private static _countSessionDurationSeconds(value: Record<string, number>) {
    return Math.min(Object.values(value).reduce((sum, v) => sum + v, 0), 59999)
  }
}
