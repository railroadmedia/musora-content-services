import { SYNC_TABLES } from '../schema'
import BaseModel from './Base'
import { string, varchar, positiveInt, nullableUint } from '../errors/validators'

export default class LessonNote extends BaseModel<{
  content_id: number
  date: string
  timestamp_ms: number | null
  notes: string
}> {
  static table = SYNC_TABLES.LESSON_NOTES

  get content_id() {
    return this._getRaw('content_id') as number
  }
  get date() {
    return this._getRaw('date') as string
  }
  get timestamp_ms() {
    return this._getRaw('timestamp_ms') as number | null
  }
  get notes() {
    return this._getRaw('notes') as string
  }

  set content_id(value: number) {
    this._setRaw('content_id', positiveInt(value))
  }
  set date(value: string) {
    this._setRaw('date', string(value))
  }
  set timestamp_ms(value: number | null) {
    this._setRaw('timestamp_ms', nullableUint(value))
  }
  // Notes are HTML
  set notes(value: string) {
    this._setRaw('notes', varchar(20000)(value))
  }
}
