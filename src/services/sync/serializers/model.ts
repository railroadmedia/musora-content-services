import { Model, RecordId } from "@nozbe/watermelondb"

export type ModelSerialized<TModel extends Model> = ExtractGetters<TModel>
type ExtractGetters<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
} & { id: RecordId }

// serializes a record to a POJO based on its model getters
// (essentially strips out all watermelon properties)
// useful for consumption in components, etc.

export default class ModelSerializer<TModel extends Model = Model> {
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
