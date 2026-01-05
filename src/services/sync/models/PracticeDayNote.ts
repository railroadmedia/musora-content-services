import { SYNC_TABLES } from '../schema'
import BaseModel from './Base'
import { throwIfMaxLengthExceeded, throwIfNotString } from '../errors/validators'

export default class PracticeDayNote extends BaseModel<{
  date: string
  notes: string
}> {
  static table = SYNC_TABLES.PRACTICE_DAY_NOTES

  get date() {
    return this._getRaw('date') as string
  }
  get notes() {
    return this._getRaw('notes') as string
  }

  set date(value: string) {
    this._setRaw('date', throwIfNotString(value))
  }
  set notes(value: string) {
    throwIfNotString(value)
    this._setRaw('notes', throwIfMaxLengthExceeded(value, 3000))
  }
}
