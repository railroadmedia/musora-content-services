import BaseModel from '../models/Base'

export type RawSerialized<TModel extends BaseModel> = Omit<TModel['_raw'], '_changed' | '_status'>

// serializes a record to a POJO based on its _raw attributes
// useful for sending to back-end for sync

export default class RawSerializer<TModel extends BaseModel = BaseModel> {
  toPlainObject(model: TModel) {
    const result = {}
    const raw = model._raw

    for (const key in raw) {
      if (key !== '_changed' && key !== '_status') {
        result[key] = raw[key]
      }
    }

    return result as RawSerialized<TModel>
  }
}
