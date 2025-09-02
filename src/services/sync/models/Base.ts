import { Model, Collection, RawRecord } from '@nozbe/watermelondb'

export default abstract class BaseModel<ExtraRaw extends object = {}> extends Model {
  declare _raw: RawRecord & ExtraRaw & {
    created_at: number
    updated_at: number
  }

  get created_at() {
    return this._getRaw('created_at') as number
  }

  set created_at(value: number) {
    this._setRaw('created_at', value)
  }

  get updated_at() {
    return this._getRaw('updated_at') as number
  }

  set updated_at(value: number) {
    this._setRaw('updated_at', value)
  }

  static _prepareCreate(
    collection: Collection<Model>,
    recordBuilder: (record: Model) => void
  ) {
    // NOTE - FOOTGUN - _setRaw marks a record as dirty, so order matters here
    // TODO - consider a better way other than overwriting the create method
    return super._prepareCreate(collection, (record: Model) => {
      record._setRaw('created_at', Math.round(Date.now() / 1000))
      record._setRaw('updated_at', Math.round(Date.now() / 1000))
      recordBuilder(record)
    })
  }

  prepareUpdate(recordBuilder: ((record: this) => void) | undefined) {
    // NOTE - FOOTGUN - _setRaw marks a record as dirty, so order matters here
    // TODO - consider a better way other than overwriting the update method
    return super.prepareUpdate((record: this) => {
      record._setRaw('updated_at', Math.round(Date.now() / 1000))
      if (recordBuilder) recordBuilder(record)
    })
  }
}
