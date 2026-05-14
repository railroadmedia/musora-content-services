import { Model } from "@nozbe/watermelondb"

export type RawSerialized<TModel extends Model> = Omit<TModel['_raw'], '_changed' | '_status'>

export default class RawSerializer<TModel extends Model = Model> {
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

  fromServerRecord(record: Record<string, unknown>): Record<string, unknown> {
    return record
  }

  static withJsonColumns<TModel extends Model>(columns: readonly string[]) {
    return class extends RawSerializer<TModel> {
      toPlainObject(model: TModel) {
        const result = super.toPlainObject(model) as Record<string, unknown>
        for (const col of columns) {
          const val = result[col]
          if (typeof val === 'string') {
            try { result[col] = JSON.parse(val) } catch { /* leave as string */ }
          }
        }
        return result as RawSerialized<TModel>
      }

      fromServerRecord(record: Record<string, unknown>) {
        const result = { ...record }
        for (const col of columns) {
          if (col in result && result[col] !== null && result[col] !== undefined && typeof result[col] !== 'string') {
            result[col] = JSON.stringify(result[col])
          }
        }
        return result
      }
    }
  }
}
