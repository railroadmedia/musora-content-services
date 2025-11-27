import { Model, Collection, RawRecord } from '@nozbe/watermelondb'
import { EpochMs } from '..'

export default abstract class BaseModel<ExtraRaw extends object = {}> extends Model {
  declare _raw: RawRecord & ExtraRaw & {
    created_at: EpochMs
    updated_at: EpochMs
  }

  get created_at() {
    return this._getRaw('created_at') as EpochMs
  }

  get updated_at() {
    return this._getRaw('updated_at') as EpochMs
  }

  static _prepareCreate(
    collection: Collection<Model>,
    recordBuilder: (record: Model) => void
  ) {
    return super._prepareCreate(collection, (record: Model) => {
      const now = Date.now() as EpochMs
      record._raw['created_at'] = now
      record._raw['updated_at'] = now
      recordBuilder(record)
    })
  }

  prepareUpdate(recordBuilder: ((record: this) => void) | undefined) {
    return super.prepareUpdate((record: this) => {
      record._raw['updated_at'] = Date.now() as EpochMs
      if (recordBuilder) recordBuilder(record)
    })
  }

  prepareMarkAsDeleted() {
    return super.prepareUpdate((record: this) => {
      if (record._raw._status === 'deleted') {
        return
      }

      record._raw['updated_at'] = Date.now() as EpochMs
      record._raw._status = 'deleted'
    })
  }
}
