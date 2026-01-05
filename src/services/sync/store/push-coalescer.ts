import BaseModel from "../models/Base"
import { RecordId } from "@nozbe/watermelondb"
import { EpochMs } from ".."
import { SyncPushResponse } from "../fetch"

type PushIntent = {
  promise: Promise<SyncPushResponse>
  records: {
    id: RecordId
    updatedAt: EpochMs
  }[]
}

export default class PushCoalescer {
  private intents: PushIntent[]

  constructor() {
    this.intents = []
  }

  push(records: BaseModel[], pusher: (records: BaseModel[]) => Promise<SyncPushResponse>) {
    const found = this.find(records)

    if (found) {
      return found.promise
    }

    return this.add(pusher(records), records)
  }

  private add(promise: Promise<SyncPushResponse>, records: BaseModel[]) {
    const intent = {
      promise,
      records: records.map(record => ({
        id: record.id,
        updatedAt: record.updated_at
      }))
    }

    const cleanup = () => this.intents.splice(this.intents.indexOf(intent), 1)
    intent.promise.finally(cleanup)

    this.intents.push(intent)

    return intent.promise
  }

  private find(records: BaseModel[]) {
    return this.intents.find(intent => {
      return records.every(record => {
        return intent.records.find(({ id, updatedAt }) => {
          return id === record.id && updatedAt >= record.updated_at
        })
      })
    })
  }
}
