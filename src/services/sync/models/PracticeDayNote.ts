import { SYNC_TABLES } from '../schema'
import BaseModel from './Base'

export default class PracticeDayNote extends BaseModel<{
  date: string
  note: string
}> {
  static table = SYNC_TABLES.PRACTICE_DAY_NOTES

  get date() {
    return this._getRaw('date') as string
  }
  get notes() {
    return this._getRaw('notes') as string
  }

  set date(value: string) {
    this._setRaw('date', value)
  }
  set notes(value: string) {
    this._setRaw('notes', value)
  }
}
