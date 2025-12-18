import BaseModel from './Base'
import { SYNC_TABLES } from '../schema'
import type { CompletionData } from '../../awards/types'
import {
  throwIfMaxLengthExceeded,
  throwIfNotNullableString,
  throwIfNotNumber,
  throwIfNotString,
  throwIfOutsideRange,
} from '../errors/validators'

export default class UserAwardProgress extends BaseModel<{
  award_id: string
  progress_percentage: number
  completed_at: string | null
  progress_data: string | null
  completion_data: string | null
}> {
  static table = SYNC_TABLES.USER_AWARD_PROGRESS

  get award_id() {
    return this._getRaw('award_id') as string
  }

  get progress_percentage() {
    return this._getRaw('progress_percentage') as number
  }

  get completed_at() {
    return this._getRaw('completed_at') as string | null
  }

  get progress_data() {
    const raw = this._getRaw('progress_data') as string | null
    return raw ? JSON.parse(raw) : null
  }

  get completion_data(): CompletionData | null {
    const raw = this._getRaw('completion_data') as string | null
    return raw ? JSON.parse(raw) : null
  }

  set award_id(value: string) {
    // varchar(255)
    throwIfNotString(value)
    this._setRaw('award_id', throwIfMaxLengthExceeded(value, 255))
  }

  set progress_percentage(value: number) {
    // int
    throwIfNotNumber(value)
    this._setRaw('progress_percentage', throwIfOutsideRange(value, 0, 100))
  }

  set completed_at(value: string | null) {
    this._setRaw('completed_at', throwIfNotNullableString(value))
  }

  set progress_data(value: any) {
    this._setRaw('progress_data', value ? JSON.stringify(value) : null)
  }

  set completion_data(value: CompletionData | null) {
    this._setRaw('completion_data', value ? JSON.stringify(value) : null)
  }
}
