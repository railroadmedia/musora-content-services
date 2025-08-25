import { Model, RecordId } from "@nozbe/watermelondb"

export default class SyncSerializer {
  toPlainObject(model: Model) {
    const result = {}
    const raw = model._raw

    for (const key in raw) {
      if (key !== '_changed' && key !== '_status') {
        result[key] = raw[key]
      }
    }

    return result as { id: RecordId } & Record<string, any>
  }
}
