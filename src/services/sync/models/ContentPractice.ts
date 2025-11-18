import BaseModel from './Base'
import { SYNC_TABLES } from '../schema'

export default class ContentPractice extends BaseModel<{
  content_id: number
  duration_seconds: number
}> {
  static table = SYNC_TABLES.CONTENT_PRACTICES

  get content_id() {
    return this._getRaw('content_id') as number
  }

  get duration_seconds() {
    return this._getRaw('duration_seconds') as number
  }

  set content_id(value: number) {
    this._setRaw('content_id', value)
  }

  set duration_seconds(value: number) {
    this._setRaw('duration_seconds', value)
  }

  /**
   * Helper to get duration in minutes
   */
  get durationMinutes(): number {
    return Math.round(this.duration_seconds / 60)
  }
}
