import BaseModel from './Base'
import { SYNC_TABLES } from '../schema'
import type { CompletionData } from '../../awards/types'

export default class UserAwardProgress extends BaseModel<{
  award_id: string
  progress_percentage: number
  completed_at: number | null
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
    return this._getRaw('completed_at') as number | null
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
    this._setRaw('award_id', value)
  }

  set progress_percentage(value: number) {
    this._setRaw('progress_percentage', value)
  }

  set completed_at(value: number | null) {
    this._setRaw('completed_at', value)
  }

  set progress_data(value: any) {
    this._setRaw('progress_data', value ? JSON.stringify(value) : null)
  }

  set completion_data(value: CompletionData | null) {
    this._setRaw('completion_data', value ? JSON.stringify(value) : null)
  }

  get isCompleted(): boolean {
    return this.completed_at !== null && this.progress_percentage === 100
  }

  get isInProgress(): boolean {
    return this.progress_percentage > 0 && !this.isCompleted
  }

  get completedAtDate(): Date | null {
    return this.completed_at ? new Date(this.completed_at) : null
  }
}
