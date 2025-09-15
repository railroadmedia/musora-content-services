import BaseModel from '../models/Base'
import { RecordId } from "@nozbe/watermelondb"

export type ModelSerialized<TModel extends BaseModel> = ExtractGetters<TModel>
type ExtractGetters<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
} & { id: RecordId }

// serializes a record to a POJO based on its model getters
// (essentially strips out all watermelon properties)
// useful for consumption in components, etc.

export default class ModelSerializer<TModel extends BaseModel = BaseModel> {
  toPlainObject(record: TModel) {
    const proto = Object.getPrototypeOf(record)
    const keys = Object.getOwnPropertyNames(proto)

    const result = {}
    for (const key of keys) {
      const desc = Object.getOwnPropertyDescriptor(proto, key)
      if (desc?.get) {
        result[key] = desc.get.call(record)
      }
    }
    result['id'] = record.id

    return result as ModelSerialized<TModel>
  }
}
