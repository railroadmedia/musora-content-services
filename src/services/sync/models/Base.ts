import { Model, Collection, RawRecord } from '@nozbe/watermelondb'
import { EpochSeconds } from '../utils/epoch'

export default abstract class BaseModel<ExtraRaw extends object = {}> extends Model {
  declare _raw: RawRecord & ExtraRaw & {
    created_at: EpochSeconds
    updated_at: EpochSeconds
  }

  get created_at() {
    return this._getRaw('created_at') as EpochSeconds
  }

  get updated_at() {
    return this._getRaw('updated_at') as EpochSeconds
  }

  static _prepareCreate(
    collection: Collection<Model>,
    recordBuilder: (record: Model) => void
  ) {
    return super._prepareCreate(collection, (record: Model) => {
      const now = Math.round(Date.now() / 1000) as EpochSeconds
      record._raw['created_at'] = now
      record._raw['updated_at'] = now
      recordBuilder(record)
    })
  }

  prepareUpdate(recordBuilder: ((record: this) => void) | undefined) {
    return super.prepareUpdate((record: this) => {
      record._raw['updated_at'] = Math.round(Date.now() / 1000) as EpochSeconds
      if (recordBuilder) recordBuilder(record)
    })
  }

  prepareMarkAsDeleted() {
    return super.prepareUpdate((record: this) => {
      record._raw['updated_at'] = Math.round(Date.now() / 1000) as EpochSeconds
      record._raw._status = 'deleted'
    })
  }
}
