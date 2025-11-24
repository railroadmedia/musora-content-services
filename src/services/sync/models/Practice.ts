import { SYNC_TABLES } from '../schema'
import BaseModel from './Base'

export default class Practice extends BaseModel<{
  manual_id: string | null
  content_id: number | null
  day: string
  auto: boolean
  duration_seconds: number
  title: string | null
}> {
  static table = SYNC_TABLES.PRACTICES

  get manual_id() {
    return this._getRaw('manual_id') as string | null
  }
  get content_id() {
    return this._getRaw('content_id') as number | null
  }
  get day() {
    return this._getRaw('day') as string
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

  set manual_id(value: string | null) {
    this._setRaw('manual_id', value)
  }
  set content_id(value: number | null) {
    this._setRaw('content_id', value)
  }
  set day(value: string) {
    this._setRaw('day', value)
  }
  set auto(value: boolean) {
    this._setRaw('auto', value)
  }
  set duration_seconds(value: number) {
    this._setRaw('duration_seconds', value)
  }
  set title(value: string | null) {
    this._setRaw('title', value)
  }
}
