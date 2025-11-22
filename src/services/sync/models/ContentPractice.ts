import { SYNC_TABLES } from '../schema'
import BaseModel from './Base'

export default class ContentPractice extends BaseModel<{
  content_id: number
  day: string
  auto: boolean
  duration_seconds: number
}> {
  static table = SYNC_TABLES.CONTENT_PRACTICES

  get content_id() {
    return this._getRaw('content_id') as number
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

  set content_id(value: number) {
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
}
