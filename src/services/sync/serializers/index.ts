import { Model, RawRecord } from "@nozbe/watermelondb"

export type SyncSerialized<T extends SyncSerializer = SyncSerializer> = ReturnType<T['toPlainObject']>

export default class SyncSerializer {
  toPlainObject(model: Model) {
    const result = {}
    const raw = model._raw

    for (const key in raw) {
      if (key !== '_changed' && key !== '_status') {
        result[key] = raw[key]
      }
    }

    return result as Omit<RawRecord, '_changed' | '_status'> & Record<string, unknown>
  }
}
